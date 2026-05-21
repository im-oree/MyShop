import { getAuth, getFirestore } from '../config/firebase.js'
import { User, Address, EmployeePermissions } from '../types/index.js'
import { generateId } from '../utils/helpers.js'


export class UserService {
  private auth = getAuth()
  private db = getFirestore()
  private collection = 'users'
  
  /**
   * Create a new user (via Firebase Auth)
   */
  async create(email: string, password: string, name: string): Promise<User> {
    // Create Firebase Auth user
    const authUser = await this.auth.createUser({
      email,
      password,
      displayName: name,
    })
    
    // Create Firestore user document
    const user: User = {
      id: authUser.uid,
      email,
      name,
      role: 'user', // Default role for new users
      createdAt: new Date(),
      updatedAt: new Date(),
      addresses: [],
    }
    
    await this.db.collection(this.collection).doc(authUser.uid).set(user)
    return user
  }
  
  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User | null> {
    const doc = await this.db.collection(this.collection).doc(id).get()
    if (!doc.exists) return null
    
    const data = doc.data() as User
    // Ensure role defaults to 'user' if not set
    return {
      ...data,
      role: data.role || 'user',
    }
  }
  
  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      const authUser = await this.auth.getUserByEmail(email)
      return this.getById(authUser.uid)
    } catch {
      return null
    }
  }
  
  /**
   * Update user profile
   */
  async update(id: string, updates: Partial<User>): Promise<void> {
    await this.db.collection(this.collection).doc(id).update({
      ...updates,
      updatedAt: new Date(),
    })
  }
  
  /**
   * Add address to user
   */
  async addAddress(userId: string, address: Omit<Address, 'id' | 'userId'>): Promise<Address> {
    const id = generateId()
    const newAddress: Address = {
      ...address,
      id,
      userId,
    }
    
    const user = await this.getById(userId)
    if (!user) throw new Error('User not found')
    
    const addresses = user.addresses || []
    addresses.push(newAddress)
    
    await this.update(userId, { addresses })
    return newAddress
  }
  
  /**
   * Update user address
   */
  async updateAddress(userId: string, addressId: string, updates: Partial<Address>): Promise<void> {
    const user = await this.getById(userId)
    if (!user) throw new Error('User not found')
    
    const addresses = user.addresses || []
    const index = addresses.findIndex(a => a.id === addressId)
    
    if (index === -1) throw new Error('Address not found')
    
    addresses[index] = { ...addresses[index], ...updates }
    await this.update(userId, { addresses })
  }
  
  /**
   * Delete user address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const user = await this.getById(userId)
    if (!user) throw new Error('User not found')
    
    const addresses = (user.addresses || []).filter(a => a.id !== addressId)
    await this.update(userId, { addresses })
  }
  
  /**
   * Get all users (admin)
   */
  async getAll(page: number = 1, limit: number = 20): Promise<{
    users: User[]
    total: number
  }> {
    const query = this.db.collection(this.collection)
    const total = (await query.count().get()).data().count
    
    const snapshot = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    
    const users = snapshot.docs.map(doc => doc.data() as User)
    return { users, total }
  }

  /**
   * Get pending seller applications (admin)
   */
  async getPendingSellerApplications(): Promise<User[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('appliedAsSeller', '==', true)
      .get()

    return snapshot.docs
      .map(doc => doc.data() as User)
      .filter(user => user.sellerApproved !== true && user.role !== 'seller')
  }

  async getEmployeesBySellerId(sellerId: string): Promise<User[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('employeeOfSellerId', '==', sellerId)
      .where('role', '==', 'employee')
      .get()

    return snapshot.docs.map(doc => doc.data() as User)
  }

  async assignEmployee(
    sellerId: string,
    targetUserId: string,
    title: string,
    template: User['employeeRoleTemplate'],
    permissions: EmployeePermissions,
  ): Promise<User> {
    await this.update(targetUserId, {
      role: 'employee',
      employeeOfSellerId: sellerId,
      employeeTitle: title,
      employeeRoleTemplate: template,
      employeePermissions: permissions,
    })

    const updated = await this.getById(targetUserId)
    if (!updated) {
      throw new Error('Failed to assign employee')
    }
    return updated
  }

  async updateEmployeeAccess(
    sellerId: string,
    employeeUserId: string,
    title: string | undefined,
    template: User['employeeRoleTemplate'],
    permissions: EmployeePermissions,
  ): Promise<User> {
    const employee = await this.getById(employeeUserId)
    if (!employee || employee.role !== 'employee' || employee.employeeOfSellerId !== sellerId) {
      throw new Error('Employee not found for this seller')
    }

    await this.update(employeeUserId, {
      employeeTitle: title || employee.employeeTitle,
      employeeRoleTemplate: template,
      employeePermissions: permissions,
    })

    const updated = await this.getById(employeeUserId)
    if (!updated) {
      throw new Error('Failed to update employee')
    }
    return updated
  }

  async removeEmployee(sellerId: string, employeeUserId: string): Promise<User> {
    const employee = await this.getById(employeeUserId)
    if (!employee || employee.role !== 'employee' || employee.employeeOfSellerId !== sellerId) {
      throw new Error('Employee not found for this seller')
    }

    await this.update(employeeUserId, {
      role: 'user',
      employeeOfSellerId: undefined,
      employeeTitle: undefined,
      employeeRoleTemplate: undefined,
      employeePermissions: undefined,
    })

    const updated = await this.getById(employeeUserId)
    if (!updated) {
      throw new Error('Failed to remove employee')
    }
    return updated
  }
}

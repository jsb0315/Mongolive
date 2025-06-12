import React, { useEffect, useState } from 'react';
import { User } from '../../types/user';
// import { fetchUsers, updateUser } from '../../services/api';
import Button from '../ui/Button';
import Table from '../ui/Table';
import Modal from '../ui/Modal';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [updatedData, setUpdatedData] = useState<string>('');

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      // const response = await fetchUsers();
      // if (response.success) {
      //   setUsers(response.data);
      // }
      
      console.log('Fetching users...');
      // Mock data for prototype
      const mockUsers: User[] = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-16')
        },
        {
          _id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          role: 'user',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-17')
        }
      ];
      setUsers(mockUsers);
      console.log('Users loaded:', mockUsers);
    };
    loadUsers();
  }, []);

  const handleEditClick = (user: User): void => {
    setSelectedUser(user);
    setUpdatedData(JSON.stringify(user, null, 2));
    setIsModalOpen(true);
    console.log('Opening user editor for user:', user._id);
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setUpdatedData('');
    console.log('User editor closed');
  };

  const handleConfirmClick = async (): Promise<void> => {
    if (selectedUser) {
      try {
        const updatedUser = JSON.parse(updatedData);
        // await updateUser(selectedUser._id, updatedUser);
        console.log('Updating user:', selectedUser._id, 'with data:', updatedUser);
        
        // Mock: Update user in state
        setUsers(prev => 
          prev.map(user => 
            user._id === selectedUser._id ? { ...user, ...updatedUser } : user
          )
        );
        
        handleModalClose();
        console.log('User updated successfully');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    console.log('Deleting user:', userId);
    
    // Mock: Remove user from state
    setUsers(prev => prev.filter(user => user._id !== userId));
    console.log('User deleted successfully');
  };

  const columns = [
    { header: 'ID', accessor: '_id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Actions', accessor: 'actions' },
  ];

  const data = users.map(user => ({
    ...user,
    actions: (
      <div className="flex space-x-2">
        <Button text="Edit" onClick={() => handleEditClick(user)} />
        <Button 
          text="Delete" 
          onClick={() => handleDeleteUser(user._id)} 
          className="bg-red-500 hover:bg-red-600" 
        />
      </div>
    ),
  }));

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      <Table columns={columns} data={data} />
      <Modal
        isVisible={isModalOpen}
        title="Edit User"
        onClose={handleModalClose}
        content={
          <div>
            <textarea
              className="w-full h-40 border border-gray-300 p-2 rounded"
              value={updatedData}
              onChange={(e) => setUpdatedData(e.target.value)}
            />
            <div className="flex justify-end mt-4">
              <Button text="Confirm" onClick={handleConfirmClick} className="mr-2" />
              <Button text="Cancel" onClick={handleModalClose} className="bg-gray-500" />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default UserManagement;
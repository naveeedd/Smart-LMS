
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import UserRegistrationForm from '@/components/admin/UserRegistrationForm';

const UserRegistration = () => {
  return (
    <MainLayout requiredRole="admin">
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">User Registration</h1>
        <UserRegistrationForm />
      </div>
    </MainLayout>
  );
};

export default UserRegistration;

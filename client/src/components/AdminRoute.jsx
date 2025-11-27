import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const AdminRoute = ({ children }) => {
    const { currentUser, userLoggedIn } = useAuth();
    const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;

    if (!userLoggedIn || !currentUser) {
        return <Navigate to="/auth" replace />;
    }

    if (currentUser.email !== adminEmail) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;

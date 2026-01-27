import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types/navigation';
import { LoginScreen } from '../screens';
import { TabNavigator } from './TabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <Stack.Screen name="Auth" component={LoginScreen} />
            ) : (
                <Stack.Screen name="MainApp" component={TabNavigator} />
            )}
        </Stack.Navigator>
    );
};

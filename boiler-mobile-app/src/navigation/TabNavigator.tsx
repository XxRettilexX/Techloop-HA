import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { DashboardScreen, ScheduleScreen, EnergyScreen, ChatScreen, ProfileScreen } from '../screens';
import { COLORS, SHADOWS } from '../theme';
import { Home, Calendar, Zap, MessageCircle, User } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                headerShown: false,
                tabBarShowLabel: true,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                    tabBarLabel: 'Home',
                }}
            />
            <Tab.Screen
                name="Schedule"
                component={ScheduleScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Energy"
                component={EnergyScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Zap size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 0,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        ...SHADOWS.deep,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
});

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { DashboardScreen, ScheduleScreen, EnergyScreen, ChatScreen } from '../screens';
import { COLORS, SHADOWS } from '../theme';
import { Home, Calendar, Zap, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary, // #6c91c2
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
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.white,
        borderTopWidth: 0,
        height: 70,
        paddingBottom: 12,
        paddingTop: 8,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: 'absolute',
        ...SHADOWS.deep,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
});

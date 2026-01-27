import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack Screens
export type AuthStackParamList = {
    Login: undefined;
};

// Main App Tab Screens
export type MainTabParamList = {
    Dashboard: undefined;
    Schedule: undefined;
    Energy: undefined;
    Chat: undefined;
    Profile: undefined;
};

// Root Navigator combining Auth and Main App
export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    MainApp: NavigatorScreenParams<MainTabParamList>;
};

// Declare global navigation types for type-safe navigation
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}

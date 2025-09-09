# Admin Panel Documentation

## Overview
The admin panel provides system administration capabilities for the Houseflow application, accessible only to the admin user (lawfinuu@gmail.com).

## Features

### 1. User Management
- **View all users**: See complete user list with registration dates, household ownership, and activity stats
- **Delete users**: Remove users from the system (with confirmation dialog)
- **User details**: View user's owned households, memberships, and shopping activity
- **Admin protection**: Cannot delete the admin user

### 2. Household Management
- **View all households**: See complete household list with member counts and activity
- **Delete households**: Remove households from the system (with confirmation dialog)
- **Household details**: View members, invites, shopping lists, and children count
- **Admin protection**: Cannot delete households owned by admin

### 3. System Statistics
- **Overview stats**: Total users, households, shopping items, medicines, etc.
- **Growth metrics**: Recent user registrations and active households
- **Activity stats**: Shopping items (active vs completed), medicine tracking
- **Top households**: Most active households by shopping list count

## Access Control

### Authentication
- Only accessible to users with email `lawfinuu@gmail.com`
- Protected by NextAuth middleware
- Automatic redirect to dashboard for non-admin users

### API Protection
- All admin API endpoints require admin authentication
- Uses `requireAdmin()` helper function
- Returns 401/403 errors for unauthorized access

## API Endpoints

### `/api/admin/users`
- **GET**: Retrieve all users with detailed information
- **DELETE**: Delete a user (requires userId in body)

### `/api/admin/households`
- **GET**: Retrieve all households with detailed information
- **DELETE**: Delete a household (requires householdId in body)

### `/api/admin/stats`
- **GET**: Retrieve comprehensive system statistics

## Navigation

### Sidebar Integration
- Admin Panel link appears in sidebar only for admin user
- Uses Shield icon for easy identification
- Positioned at bottom of navigation menu

### Command Palette
- Searchable admin panel access via Cmd+K
- Keywords: admin, management, users, statistics, system

## Safety Features

### Data Protection
- Cannot delete admin user or admin-owned households
- Confirmation dialogs for all destructive actions
- Comprehensive error handling and user feedback

### No Auto-refresh Issues
- Static data loading with manual refresh capability
- No automatic polling or real-time updates
- Prevents continuous API calls during development

## Usage

1. **Access**: Login as lawfinuu@gmail.com and navigate to Admin Panel
2. **Overview**: Check system statistics and top households
3. **User Management**: Review and manage user accounts
4. **Household Management**: Review and manage household data
5. **Testing**: Use delete functions to clean up test data

## Development Notes

- All admin functionality is isolated in `/admin` routes
- Middleware protection prevents unauthorized access
- Admin helpers provide reusable authentication logic
- Responsive design works on all screen sizes
- Follows existing app design patterns and styling

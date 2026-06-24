import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

const PermissionsContext = createContext(null);

/**
 * Provides helper functions to check the current user's permissions.
 * Super Admin always returns true for every check.
 */
export function PermissionsProvider({ children }) {
  const { user } = useAuth();

  const value = useMemo(() => {
    if (!user) {
      return {
        can: () => false,
        canAccessPage: () => false,
        canViewZone: () => false,
        canExportCSV: () => false,
        permissions: null,
      };
    }

    // Super Admin bypasses all permission checks
    const isSuperAdmin = user.role === "Super Admin";
    const perms = user.permissions || {};

    /**
     * Check if the user can perform an action on an entity.
     * @param {string} entity - e.g. "leads", "campaigns"
     * @param {string} action - "view" | "create" | "edit" | "delete" | "exportCSV"
     */
    function can(entity, action) {
      if (isSuperAdmin) return true;
      return !!(perms.actions?.[entity]?.[action]);
    }

    /**
     * Check if the user can access a given page slug.
     * @param {string} page - e.g. "leads", "vigor-space", "settings"
     */
    function canAccessPage(page) {
      if (isSuperAdmin) return true;
      return Array.isArray(perms.pages) && perms.pages.includes(page);
    }

    /**
     * Check if the user can view a specific Vigor Space zone.
     * @param {string} zoneName - zone name string
     */
    function canViewZone(zoneName) {
      if (isSuperAdmin) return true;
      const vs = perms.vigorSpace;
      if (!vs) return true; // default: show all for backward compatibility
      if (vs.canViewZones === "*" || !vs.canViewZones) return true;
      return Array.isArray(vs.canViewZones) && vs.canViewZones.includes(zoneName);
    }

    /**
     * Check if the user can export CSV.
     * Super Admins always can. Others only if they have been granted access
     * (permanently OR temporarily via csvExportExpiresAt).
     */
    function canExportCSV(entity) {
      if (isSuperAdmin) return true;
      
      const entityPerm = perms.actions?.[entity];
      if (!entityPerm || !entityPerm.exportCSV) return false;

      // Check if entity-specific CSV access has expired
      const expiresAt = entityPerm.exportCSVExpiresAt;
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        return false;
      }

      return true;
    }

    /**
     * Check if the user can manage Vigor Space zones (add/edit/delete zones, states, cities).
     */
    function canManageVigorSpace() {
      if (isSuperAdmin) return true;
      return !!(perms.vigorSpace?.canManageZones);
    }

    return {
      can,
      canAccessPage,
      canViewZone,
      canExportCSV,
      canManageVigorSpace,
      permissions: perms,
      isSuperAdmin,
    };
  }, [user]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

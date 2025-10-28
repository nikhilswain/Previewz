import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPasscode, verifyPasscode, type VaultConfig } from "@/lib/crypto";

type VaultState = {
  config: VaultConfig | null;
  isUnlocked: boolean;
  unlockUntil: number | null; // epoch ms
  blurHidden: boolean;
  attempts: number;
  rememberTTL: boolean; // if true, remember for TTL in session
  // actions
  setupPasscode: (code: string) => Promise<void>;
  verifyAndUnlock: (code: string, ttlMinutes?: number) => Promise<boolean>;
  lock: () => void;
  setBlurHidden: (v: boolean) => void;
  hydrateFromSession: () => void;
  setRememberTTL: (v: boolean) => void;
};

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      config: null,
      isUnlocked: false,
      unlockUntil: null,
      blurHidden: true,
      attempts: 0,
      rememberTTL: false,

      setupPasscode: async (code: string) => {
        const cfg = await hashPasscode(code);
        set({ config: cfg });
      },

      verifyAndUnlock: async (code: string, ttlMinutes = 20) => {
        const { config } = get();
        if (!config) return false;
        const ok = await verifyPasscode(code, config);
        if (ok) {
          const remember = get().rememberTTL;
          if (remember) {
            const until = Date.now() + ttlMinutes * 60_000;
            set({ isUnlocked: true, unlockUntil: until, attempts: 0 });
            try {
              sessionStorage.setItem("vaultUnlockedUntil", String(until));
            } catch {}
          } else {
            set({ isUnlocked: true, unlockUntil: null, attempts: 0 });
          }
        } else {
          set({ attempts: get().attempts + 1 });
        }
        return ok;
      },

      lock: () => {
        set({ isUnlocked: false, unlockUntil: null });
        try {
          sessionStorage.removeItem("vaultUnlockedUntil");
        } catch {}
      },

      setBlurHidden: (v: boolean) => set({ blurHidden: v }),

      setRememberTTL: (v: boolean) => set({ rememberTTL: v }),

      hydrateFromSession: () => {
        try {
          // Only hydrate session unlock if user opted in
          if (!get().rememberTTL) {
            try {
              sessionStorage.removeItem("vaultUnlockedUntil");
            } catch {}
            set({ isUnlocked: false, unlockUntil: null });
            return;
          }
          const raw = sessionStorage.getItem("vaultUnlockedUntil");
          if (!raw) return;
          const until = Number(raw);
          if (Number.isFinite(until) && until > Date.now()) {
            set({ isUnlocked: true, unlockUntil: until });
          } else {
            set({ isUnlocked: false, unlockUntil: null });
            sessionStorage.removeItem("vaultUnlockedUntil");
          }
        } catch {}
      },
    }),
    {
      name: "vault-store",
      partialize: (state) => ({
        config: state.config,
        blurHidden: state.blurHidden,
        rememberTTL: state.rememberTTL,
      }),
    }
  )
);

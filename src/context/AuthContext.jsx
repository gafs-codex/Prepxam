"use client"
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("full_name, role")
                .eq("id", user.id)
                .single();

            setProfile(data);
            setLoading(false);
        }

        loadProfile();

        // Also listen for login/logout events, so the context stays in sync
        const { data: listener } = supabase.auth.onAuthStateChange(() => {
            loadProfile();
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ profile, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext);
}
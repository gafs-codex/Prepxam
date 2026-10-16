"use client"
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { friendlyMessage } from "@/lib/net";
import { isNetworkError } from "@/lib/rpc";

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const requestRef = useRef(0);   // so a slow, old request can't overwrite a newer one
    const userIdRef = useRef(null);

    const loadProfile = useCallback(async () => {
        const request = ++requestRef.current;
        const isLatest = () => request === requestRef.current;

        try {
            // getSession reads the saved session, so it works without a connection.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            // a dead connection is not a sign-out
            if (sessionError && isNetworkError(sessionError)) throw sessionError;

            if (!session) {
                if (!isLatest()) return;
                userIdRef.current = null;
                setProfile(null);
                setError(null);
                return;
            }

            userIdRef.current = session.user.id;

            const { data, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, role")
                .eq("id", session.user.id)
                .single();

            if (profileError) throw profileError;
            if (!isLatest()) return;

            setProfile(data);
            setError(null);
        } catch (err) {
            console.error("Could not load the profile:", err);
            if (!isLatest()) return;
            // keep whoever is already signed in. A failed request is not a sign-out.
            setError(friendlyMessage(err));
        } finally {
            if (isLatest()) setLoading(false);
        }
    }, []);

    const refresh = useCallback(() => {
        setLoading(true);
        return loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        loadProfile();

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            // nothing about the person changed
            if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;

            if (event === "SIGNED_OUT") {
                requestRef.current += 1;
                userIdRef.current = null;
                setProfile(null);
                setError(null);
                setLoading(false);
                return;
            }

            // SIGNED_IN also fires when a tab regains focus. Only reload for a different person.
            if (event === "SIGNED_IN") {
                if (session?.user?.id === userIdRef.current) return;
                setLoading(true);
            }

            // never call Supabase directly inside this callback
            setTimeout(() => loadProfile(), 0);
        });

        return () => listener.subscription.unsubscribe();
    }, [loadProfile]);

    return (
        <AuthContext.Provider value={{ profile, loading, error, refresh }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext);
}
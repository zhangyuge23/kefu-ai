'use client';

import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

const CACHE_KEY = 'kefu_auth_profile';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const fetchingRef = useRef(false);
  const supabase = createBrowserClient();

  // 从缓存加载
  const loadFromCache = (): Profile | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
      
      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  // 保存到缓存
  const saveToCache = (profileData: Profile) => {
    try {
      const cacheData = {
        data: profileData,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save cache:', e);
    }
  };

  // 比较数据是否有变化
  const hasChanges = (oldData: Profile | null, newData: Profile | null): boolean => {
    if (!oldData && newData) return true;
    if (oldData && !newData) return true;
    if (!oldData && !newData) return false;
    return oldData!.credits !== newData!.credits || 
           oldData!.nickname !== newData!.nickname;
  };

  // 后台静默刷新
  const fetchProfileSilent = async (userId: string, showLoading = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    if (showLoading) setLoading(true);
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data && hasChanges(profile, data)) {
        setProfile(data);
        saveToCache(data);
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      fetchingRef.current = false;
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // 获取当前session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // 先从缓存加载
        const cachedProfile = loadFromCache();
        if (cachedProfile) {
          setProfile(cachedProfile);
          setIsFromCache(true);
        }
        // 再后台静默刷新
        fetchProfileSilent(currentUser.id, !cachedProfile);
      } else {
        setLoading(false);
      }
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // 先从缓存加载
          const cachedProfile = loadFromCache();
          if (cachedProfile) {
            setProfile(cachedProfile);
            setIsFromCache(true);
          }
          // 再后台静默刷新
          fetchProfileSilent(currentUser.id, !cachedProfile);
        } else {
          setProfile(null);
          setLoading(false);
          localStorage.removeItem(CACHE_KEY);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      saveToCache(data);
    }
    setLoading(false);
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUpWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    localStorage.removeItem(CACHE_KEY);
  }

  return {
    user,
    profile,
    loading,
    isFromCache,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile: () => user && fetchProfile(user.id),
  };
}

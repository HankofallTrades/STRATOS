import { useState, useCallback } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { useToast } from '@/components/core/Toast/use-toast';
import { updateUserProfile, fetchUserProfile, type ProfileUpdateData } from '../model/accountRepository';

export const useOnboarding = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const checkNeedsOnboarding = useCallback(async () => {
        if (!user) return false;

        try {
            const profileData = await fetchUserProfile(user.id);

            const needsOnboarding =
                !profileData ||
                profileData.age === null ||
                profileData.height === null ||
                profileData.weight === null ||
                profileData.focus === null ||
                profileData.preferred_weight_unit === null ||
                profileData.preferred_height_unit === null ||
                profileData.preferred_distance_unit === null;

            return needsOnboarding;
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return false;
        }
    }, [user]);

    const submitOnboarding = async (values: ProfileUpdateData) => {
        if (!user) {
            toast({
                title: "Error",
                description: "You must be logged in to update your profile.",
                variant: "destructive",
            });
            return false;
        }

        setIsSubmitting(true);
        try {
            await updateUserProfile(user.id, values);
            toast({
                title: "Profile Updated",
                description: "Your information has been saved successfully.",
            });
            return true;
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive",
            });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        isSubmitting,
        checkNeedsOnboarding,
        submitOnboarding
    };
};

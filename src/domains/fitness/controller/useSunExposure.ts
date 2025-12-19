import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addSunExposure } from '../model/fitnessRepository';

export const useSunExposure = (userId: string | null) => {
    const queryClient = useQueryClient();
    const today = new Date().toISOString().split('T')[0];

    const logSunMutation = useMutation({
        mutationFn: async (exposureHours: number) => {
            if (!userId) throw new Error('User not identified.');
            await addSunExposure(userId, exposureHours, today);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dailySunExposure', userId, today] });
            toast.success('Sun exposure logged successfully!');
        },
        onError: (error: any) => {
            console.error('Failed to log sun exposure:', error);
            toast.error('Failed to log sun exposure. Please try again.');
        },
    });

    const handleLogSun = async (hours: string, minutes: string) => {
        if (!userId) {
            toast.error('User not identified. Please try again.');
            return false;
        }

        const parsedHours = hours ? parseInt(hours, 10) : 0;
        const parsedMinutes = minutes ? parseInt(minutes, 10) : 0;

        if (isNaN(parsedHours) || parsedHours < 0) {
            toast.error('Please enter a valid non-negative number for hours.');
            return false;
        }
        if (isNaN(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 59) {
            toast.error('Please enter a valid number of minutes (0-59).');
            return false;
        }
        if (parsedHours === 0 && parsedMinutes === 0) {
            toast.error('Please enter some sun exposure time.');
            return false;
        }

        const totalExposureHours = parsedHours + (parsedMinutes / 60);
        await logSunMutation.mutateAsync(totalExposureHours);
        return true;
    };

    return {
        logSun: handleLogSun,
        isLogging: logSunMutation.isPending,
    };
};

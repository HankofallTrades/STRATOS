import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addProteinIntake } from '../model/fitnessRepository';

export const useNutrition = (userId: string | null) => {
    const queryClient = useQueryClient();
    const today = new Date().toISOString().split('T')[0];

    const logProteinMutation = useMutation({
        mutationFn: async (amountGrams: number) => {
            if (!userId) throw new Error('User not identified.');
            await addProteinIntake(userId, amountGrams, today);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dailyProteinIntake', userId, today] });
            toast.success('Protein logged successfully!');
        },
        onError: (error: any) => {
            console.error('Failed to log protein:', error);
            toast.error('Failed to log protein. Please try again.');
        },
    });

    const handleLogProtein = async (amount: string) => {
        if (!userId) {
            toast.error('User not identified. Please try again.');
            return false;
        }
        if (!amount) {
            toast.error('Please enter an amount.');
            return false;
        }
        const amountGrams = parseInt(amount, 10);
        if (isNaN(amountGrams) || amountGrams <= 0) {
            toast.error('Please enter a valid positive number for grams.');
            return false;
        }

        await logProteinMutation.mutateAsync(amountGrams);
        return true;
    };

    return {
        logProtein: handleLogProtein,
        isLogging: logProteinMutation.isPending,
    };
};

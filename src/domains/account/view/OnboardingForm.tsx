import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/core/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/core/form";
import { Input } from "@/components/core/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select";
import { Toggle } from "@/components/core/Toggle/toggle";
import { useOnboarding } from '../controller/useOnboarding';
import type { ProfileUpdateData } from '../model/accountRepository';

// Define Zod schema for validation
const formSchema = z.object({
  age: z.coerce.number().int().positive("Age must be a positive number.").min(13, "Must be at least 13 years old.").max(120),
  height: z.coerce.number().positive("Height must be a positive number."),
  weight: z.coerce.number().positive("Weight must be a positive number."),
  focus: z.enum(['Strength/Hypertrophy', 'Endurance', 'Speed', 'Weight Loss', 'General Fitness']),
  preferred_weight_unit: z.enum(['kg', 'lb']),
  preferred_height_unit: z.enum(['cm', 'ft_in']),
  preferred_distance_unit: z.enum(['km', 'mi']),
});

// Infer the form type from the schema
type OnboardingFormValues = z.infer<typeof formSchema>;

interface OnboardingFormProps {
  onSuccess: () => void; // Callback when the form submits successfully
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ onSuccess }) => {
  const { isSubmitting, submitOnboarding } = useOnboarding();

  // Initialize the form
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: undefined,
      height: undefined,
      weight: undefined,
      focus: 'General Fitness',
      preferred_weight_unit: 'kg',
      preferred_height_unit: 'cm',
      preferred_distance_unit: 'km',
    },
  });

  // Handle form submission
  async function onSubmit(values: OnboardingFormValues) {
    const success = await submitOnboarding(values as ProfileUpdateData);
    if (success) {
      onSuccess();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" id="onboarding-form">
        {/* Age */}
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter your age" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Height */}
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height ({form.watch('preferred_height_unit') === 'cm' ? 'cm' : 'ft/in'})</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder={`Enter height in ${form.watch('preferred_height_unit') === 'cm' ? 'cm' : 'feet/inches'}`} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Height Unit Preference - Using Toggles */}
        <FormField
          control={form.control}
          name="preferred_height_unit"
          render={({ field }) => {
            // Get the current value for styling
            const currentValue = field.value;
            return (
              <FormItem>
                {/* No FormLabel */}
                <FormControl>
                  <div className="flex space-x-2">
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'cm'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('cm');
                      }}
                      aria-label="Set height unit to centimeters"
                    >
                      cm
                    </Toggle>
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'ft_in'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('ft_in');
                      }}
                      aria-label="Set height unit to feet and inches"
                    >
                      ft/in
                    </Toggle>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Weight */}
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight ({form.watch('preferred_weight_unit')})</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder={`Enter weight in ${form.watch('preferred_weight_unit')}`} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weight Unit Preference - Using Toggles */}
        <FormField
          control={form.control}
          name="preferred_weight_unit"
          render={({ field }) => {
            const currentValue = field.value;
            return (
              <FormItem>
                {/* No FormLabel */}
                <FormControl>
                  <div className="flex space-x-2">
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'kg'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('kg');
                      }}
                      aria-label="Set weight unit to kilograms"
                    >
                      kg
                    </Toggle>
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'lb'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('lb');
                      }}
                      aria-label="Set weight unit to pounds"
                    >
                      lb
                    </Toggle>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Fitness Focus */}
        <FormField
          control={form.control}
          name="focus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Fitness Focus</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your main goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Strength/Hypertrophy">Strength / Muscle Gain</SelectItem>
                  <SelectItem value="Endurance">Endurance</SelectItem>
                  <SelectItem value="Speed">Speed / Power</SelectItem>
                  <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                  <SelectItem value="General Fitness">General Fitness</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Distance Unit Preference - Using Toggles */}
        <FormField
          control={form.control}
          name="preferred_distance_unit"
          render={({ field }) => {
            const currentValue = field.value;
            return (
              <FormItem>
                {/* Re-add FormLabel */}
                <FormLabel>Preferred Distance Unit</FormLabel>
                <FormControl>
                  {/* Centered Toggles */}
                  <div className="flex space-x-2">
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'km'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('km');
                      }}
                      aria-label="Set distance unit to kilometers"
                    >
                      km
                    </Toggle>
                    <Toggle
                      variant="outline"
                      pressed={currentValue === 'mi'}
                      onPressedChange={(isPressed) => {
                        if (isPressed) field.onChange('mi');
                      }}
                      aria-label="Set distance unit to miles"
                    >
                      mi
                    </Toggle>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Information"}
        </Button>
      </form>
    </Form>
  );
}; 
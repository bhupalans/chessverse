'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeControl } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const timeControlPresets: { name: string; value: TimeControl }[] = [
  { name: 'Bullet (1+0)', value: { initial: 60000, increment: 0 } },
  { name: 'Blitz (3+0)', value: { initial: 180000, increment: 0 } },
  { name: 'Blitz (5+0)', value: { initial: 300000, increment: 0 } },
  { name: 'Rapid (10+5)', value: { initial: 600000, increment: 5000 } },
];

const formSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters.'),
  timeControl: z.string().min(1, 'Time control is required'),
  startTime: z.date({ required_error: 'A start date is required.' }),
  durationMinutes: z.coerce.number().min(5, 'Duration must be at least 5 minutes.'),
  maxPlayers: z.coerce.number().min(4, 'Must have at least 4 players.'),
});

export type TournamentFormValues = z.infer<typeof formSchema>;

interface TournamentFormProps {
  onSubmit: (data: TournamentFormValues) => void;
  defaultValues?: Partial<TournamentFormValues>;
}

export function TournamentForm({ onSubmit, defaultValues }: TournamentFormProps) {
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      timeControl: JSON.stringify(timeControlPresets[1].value),
      durationMinutes: 60,
      maxPlayers: 16,
      ...defaultValues,
    },
  });

  const handleSubmit = (data: TournamentFormValues) => {
    const finalData = {
        ...data,
        timeControl: JSON.parse(data.timeControl)
    }
    onSubmit(finalData as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tournament Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekly Blitz Arena" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timeControl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time Control</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time control" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeControlPresets.map((preset) => (
                    <SelectItem key={preset.name} value={JSON.stringify(preset.value)}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Time</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Tournament'}
        </Button>
      </form>
    </Form>
  );
}

import React, { useState, useEffect } from 'react';
import { CardioSet, timeToSeconds, secondsToTime, formatTime } from '@/lib/types/workout';
import { Card, CardContent } from '@/components/core/card';
import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  Circle,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CardioSetComponentProps {
  set: CardioSet;
  setNumber: number;
  onUpdate: (setId: string, updates: Partial<CardioSet>) => void;
  onComplete: (setId: string, completed: boolean) => void;
  onDelete: (setId: string) => void;
  isActive?: boolean;
}

const CardioSetComponent: React.FC<CardioSetComponentProps> = ({
  set,
  setNumber,
  onUpdate,
  onComplete,
  onDelete,
  isActive = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValues, setTempValues] = useState({
    time: set.time,
    distance_km: set.distance_km || 0,
  });

  useEffect(() => {
    if (isActive && !set.completed) {
      setIsEditing(true);
    }
  }, [isActive, set.completed]);

  const handleSave = () => {
    const updates: Partial<CardioSet> = {
      time: tempValues.time,
      distance_km: tempValues.distance_km > 0 ? tempValues.distance_km : undefined,
    };

    onUpdate(set.id, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValues({
      time: set.time,
      distance_km: set.distance_km || 0,
    });
    setIsEditing(false);
  };

  const calculatePace = (distance_km?: number, time?: { hours: number; minutes: number; seconds: number }) => {
    if (!distance_km || !time || distance_km === 0) return null;
    const totalSeconds = timeToSeconds(time);
    const paceMinPerKm = (totalSeconds / 60) / distance_km;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  };

  if (isEditing) {
    return (
      <Card className={cn("mb-4", isActive && "ring-2 ring-fitnessBlue")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Set {setNumber}</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`duration-${set.id}`} className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration (minutes)
              </Label>
              <Input
                id={`duration-${set.id}`}
                type="number"
                value={tempValues.time.minutes + (tempValues.time.hours * 60)}
                onChange={(e) => {
                  const totalMinutes = parseInt(e.target.value) || 0;
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  setTempValues(prev => ({
                    ...prev,
                    time: { hours, minutes, seconds: prev.time.seconds }
                  }));
                }}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor={`distance-${set.id}`} className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Distance (km)
              </Label>
              <Input
                id={`distance-${set.id}`}
                type="number"
                step="0.1"
                value={tempValues.distance_km}
                onChange={(e) => setTempValues(prev => ({
                  ...prev,
                  distance_km: parseFloat(e.target.value) || 0
                }))}
                min="0"
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "mb-4 transition-all",
      set.completed ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "",
      isActive && "ring-2 ring-fitnessBlue"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Set {setNumber}</span>
            {set.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={set.completed}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(set.id)}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-mono">
              {formatTime(set.time)}
            </span>
          </div>

          {set.distance_km && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {set.distance_km.toFixed(1)} km
              </span>
            </div>
          )}

          {set.distance_km && set.time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-mono">
                {calculatePace(set.distance_km, set.time)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {set.distance_km && set.time 
              ? `Pace: ${calculatePace(set.distance_km, set.time)}`
              : 'Duration-based cardio set'
            }
          </div>

          <Button
            size="sm"
            variant={set.completed ? "outline" : "default"}
            onClick={() => onComplete(set.id, !set.completed)}
            className="flex items-center gap-2"
          >
            {set.completed ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark Complete
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CardioSetComponent; 
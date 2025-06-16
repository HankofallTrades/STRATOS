import React, { useState, useEffect } from 'react';
import { CardioSet } from '@/lib/types/workout';
import { Card, CardContent } from '@/components/core/card';
import { Button } from '@/components/core/button';
import { Badge } from '@/components/core/badge';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';
import { 
  Clock, 
  MapPin, 
  Activity, 
  Heart, 
  Flame, 
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
    duration_seconds: set.duration_seconds,
    distance_km: set.distance_km || 0,
    heart_rate_bpm: set.heart_rate_bpm?.join(',') || '',
    perceived_exertion: set.perceived_exertion || 5,
    calories_burned: set.calories_burned || 0,
  });

  useEffect(() => {
    if (isActive && !set.completed) {
      setIsEditing(true);
    }
  }, [isActive, set.completed]);

  const handleSave = () => {
    const updates: Partial<CardioSet> = {
      duration_seconds: tempValues.duration_seconds,
      distance_km: tempValues.distance_km > 0 ? tempValues.distance_km : undefined,
      heart_rate_bpm: tempValues.heart_rate_bpm ? 
        tempValues.heart_rate_bpm.split(',').map(hr => parseInt(hr.trim())).filter(hr => !isNaN(hr)) : 
        undefined,
      perceived_exertion: tempValues.perceived_exertion,
      calories_burned: tempValues.calories_burned > 0 ? tempValues.calories_burned : undefined,
    };

    // Calculate pace if distance and duration are provided
    if (updates.distance_km && updates.duration_seconds) {
      const paceMinPerKm = (updates.duration_seconds / 60) / updates.distance_km;
      updates.pace_min_per_km = paceMinPerKm;
    }

    onUpdate(set.id, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValues({
      duration_seconds: set.duration_seconds,
      distance_km: set.distance_km || 0,
      heart_rate_bpm: set.heart_rate_bpm?.join(',') || '',
      perceived_exertion: set.perceived_exertion || 5,
      calories_burned: set.calories_burned || 0,
    });
    setIsEditing(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceMinPerKm?: number) => {
    if (!paceMinPerKm) return null;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  };

  const getHeartRateZoneColor = (zone?: number) => {
    const zoneColors = {
      1: 'bg-blue-500',
      2: 'bg-green-500', 
      3: 'bg-yellow-500',
      4: 'bg-orange-500',
      5: 'bg-red-500',
    };
    return zoneColors[zone as keyof typeof zoneColors] || 'bg-gray-500';
  };

  const getRPEColor = (rpe: number) => {
    if (rpe <= 3) return 'text-green-600';
    if (rpe <= 6) return 'text-yellow-600';
    if (rpe <= 8) return 'text-orange-600';
    return 'text-red-600';
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
                Duration (seconds)
              </Label>
              <Input
                id={`duration-${set.id}`}
                type="number"
                value={tempValues.duration_seconds}
                onChange={(e) => setTempValues(prev => ({
                  ...prev,
                  duration_seconds: parseInt(e.target.value) || 0
                }))}
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
              />
            </div>

            <div>
              <Label htmlFor={`hr-${set.id}`} className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Heart Rate (bpm)
              </Label>
              <Input
                id={`hr-${set.id}`}
                type="text"
                placeholder="150,155,160"
                value={tempValues.heart_rate_bpm}
                onChange={(e) => setTempValues(prev => ({
                  ...prev,
                  heart_rate_bpm: e.target.value
                }))}
              />
            </div>

            <div>
              <Label htmlFor={`rpe-${set.id}`} className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                RPE (1-10)
              </Label>
              <Input
                id={`rpe-${set.id}`}
                type="number"
                value={tempValues.perceived_exertion}
                onChange={(e) => setTempValues(prev => ({
                  ...prev,
                  perceived_exertion: parseInt(e.target.value) || 5
                }))}
                min="1"
                max="10"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor={`calories-${set.id}`} className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Calories Burned
              </Label>
              <Input
                id={`calories-${set.id}`}
                type="number"
                value={tempValues.calories_burned}
                onChange={(e) => setTempValues(prev => ({
                  ...prev,
                  calories_burned: parseInt(e.target.value) || 0
                }))}
                min="0"
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-mono">
              {formatDuration(set.duration_seconds)}
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

          {set.pace_min_per_km && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-mono">
                {formatPace(set.pace_min_per_km)}
              </span>
            </div>
          )}

          {set.perceived_exertion && (
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-semibold", getRPEColor(set.perceived_exertion))}>
                RPE {set.perceived_exertion}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {set.target_heart_rate_zone && (
              <Badge 
                variant="secondary"
                className={cn("text-white", getHeartRateZoneColor(set.target_heart_rate_zone))}
              >
                Zone {set.target_heart_rate_zone}
              </Badge>
            )}
            {set.calories_burned && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {set.calories_burned} cal
              </Badge>
            )}
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
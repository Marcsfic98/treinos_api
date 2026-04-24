import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface InputDto {
    userId: string;
    name: string;
    workoutDays: Array<{
        name: string;
        weekDay: WeekDay;
        isRest: boolean;
        estimatedDurationInSeconds: number;
        exercises: Array<{
            order: number;
            name: string;
            sets: number;
            reps: number;
            restTimeInSeconds: number;
        }>
    }>
}

export class CreateWorkoutPlan {
  async execute(dto: InputDto){
    const existentWorkoutPlan = await prisma.workoutPlan.findFirst({
        where: {
          isActive: true
        }
      })

      return prisma.$transaction(async (tx) => {

     
      if (existentWorkoutPlan) {
        await tx.workoutPlan.update({
          where: {
            id: existentWorkoutPlan.id  
      },
      data:{
        isActive: false
      }
    })
  }

    const workoutPlan = await tx.workoutPlan.create({
      data: {
        name: dto.name,
        userId: dto.userId,
        isActive: true,
        workoutDays: {
          create: dto.workoutDays.map((workoutDay) => ({
            name: workoutDay.name,
            weekDay: workoutDay.weekDay,
            isRest: workoutDay.isRest,
            estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
            exercises: {
              create: workoutDay.exercises.map((exercise) => ({
                order: exercise.order,
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                restTimeInSeconds: exercise.restTimeInSeconds
              }))
            }
        }))
      }
    }
  })
    const result = await tx.workoutPlan.findUnique({
      where: { id: workoutPlan.id},
      include: {
        workoutDays: {
          include: {
            exercises: true 
          }
        } 
      }
    });

    if(!result){
      throw new Error("Workout plan not found ")
    }
    return result;
     })
  }
}
"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function FeatureCard({
  icon,
  title,
  description,
  className,
  variant = "glass",
}: {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
  variant?: "primary" | "glass"
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -10, transition: { duration: 0.3 } }}
      transition={{ duration: 0.5 }}
      className={cn(
        "p-10 rounded-[2.5rem] transition-colors duration-500 group flex flex-col justify-between border border-transparent",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:shadow-primary/40"
          : "glass-card hover:bg-white/40 dark:hover:bg-white/10 hover:border-primary/30 hover:shadow-lg",
        className,
      )}
    >
      <div
        className={cn(
          "p-4 rounded-3xl w-fit mb-8 transition-transform group-hover:scale-110",
          variant === "primary" ? "bg-white/20" : "bg-primary/5",
        )}
      >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
          className: cn("h-10 w-10", variant === "primary" ? "text-white" : "text-primary"),
        })}
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-4">{title}</h3>
        <p className={cn("text-lg leading-relaxed", variant === "primary" ? "text-white/80" : "text-muted-foreground")}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}

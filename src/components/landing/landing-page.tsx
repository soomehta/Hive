import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Mic,
  Shield,
  MessageSquare,
  Plug,
  Sun,
  Check,
  ArrowRight,
  Hexagon,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Personal AI Assistant",
    description:
      "Every team member gets a PA that knows their role, projects, and preferences. Ask anything in natural language.",
  },
  {
    icon: Mic,
    title: "Voice-First Commands",
    description:
      "Speak to create tasks, check your schedule, or draft emails. Your PA understands context and acts on it.",
  },
  {
    icon: Shield,
    title: "Graduated Autonomy",
    description:
      "Choose how much control you want. Auto-pilot, co-pilot, or manual mode. Override per action type.",
  },
  {
    icon: MessageSquare,
    title: "Reports as Conversations",
    description:
      'No dashboards. Ask "How\'s the team doing?" and get a narrative answer backed by real data.',
  },
  {
    icon: Plug,
    title: "Smart Integrations",
    description:
      "Google Calendar, Gmail, Outlook, Slack. Your PA reads your calendar, sends emails, and posts to Slack on your behalf.",
  },
  {
    icon: Sun,
    title: "Morning Briefings",
    description:
      "Start every day with a personalized briefing: your tasks, meetings, blockers, and what to focus on.",
  },
];

const steps = [
  {
    number: "1",
    title: "Speak or Type",
    description:
      'Tell your PA what you need in plain English. "Create a task for Sarah to review the design by Friday."',
  },
  {
    number: "2",
    title: "PA Plans & Acts",
    description:
      "Your PA classifies the intent, plans the action, and either executes immediately or asks for your approval.",
  },
  {
    number: "3",
    title: "You Stay in Control",
    description:
      "Review drafts, approve actions, or adjust. Your PA learns from your corrections and gets smarter over time.",
  },
];

const teamFeatures = [
  "Up to 3 projects",
  "AI summaries (read-only)",
  "Basic team collaboration",
];

const proFeatures = [
  "Unlimited projects & workspaces",
  "Full PA with tool use & actions",
  "Voice commands",
  "Google, Outlook & Slack",
  "Morning briefings & digests",
  "Conversational reports",
  "PA learning & corrections",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Hexagon className="size-6 fill-primary text-primary-foreground" />
              <span className="text-xl font-bold tracking-tight">Hive</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <a
                href="#features"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Pricing
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm">
              AI-Native Project Management
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your AI Assistant That Actually{" "}
              <span className="text-primary/80">Manages Projects</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Hive gives every team member a personal AI assistant that creates
              tasks, schedules meetings, drafts emails, and generates
              reports&mdash;all from natural language. Voice or text.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/sign-up">
                  Start Free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto"
              >
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </div>

          {/* Mock PA Conversation */}
          <div className="mx-auto mt-16 max-w-lg">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/50 pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary">
                    <Brain className="size-4 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-sm">Hive PA</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                    Create a task for Sarah to review the homepage design by
                    Friday, high priority
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
                    Done! I created &quot;Review homepage design&quot; assigned
                    to Sarah Chen, due Friday, priority high. She&apos;s been
                    notified.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                    How&apos;s the team doing this week?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
                    Your team completed 12 tasks this week, up 20% from last
                    week. Two blockers remain on Project Phoenix. Sarah is at
                    capacity&mdash;consider redistributing her Friday
                    deliverables.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof / Philosophy */}
      <section className="border-y bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-6 text-center text-sm font-medium text-muted-foreground sm:gap-10">
            <span>5 Core Modules</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Voice-First</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Zero Dashboards</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Graduated Autonomy</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Async-First</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Project management designed around AI from the ground up. Not
              bolted on&mdash;built in.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-muted/60">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-y bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Three steps from thought to action. Your PA handles the rest.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Start free. Upgrade when your team needs the full PA experience.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Free Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>
                  For small teams getting started
                </CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {teamFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/sign-up">Get Started Free</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary/50">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>
                  Full PA experience for growing teams
                </CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">$3</span>
                  <span className="text-muted-foreground">
                    /user/month
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {proFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href="/sign-up">
                    Start Free Trial
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to work with your AI assistant?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            Join teams who manage projects through conversation, not clicks.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Hexagon className="size-5 fill-primary text-primary-foreground" />
            <span className="font-semibold">Hive</span>
          </div>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Sign Up
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Hive. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

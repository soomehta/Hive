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
  Bot,
  LayoutGrid,
  AlertTriangle,
  Users,
  Wrench,
  ArrowDown,
  Columns3,
  List,
  LayoutDashboard,
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
  {
    icon: Bot,
    title: "Bee Swarm Intelligence",
    description:
      "Complex requests automatically dispatch specialized AI bees — Analysts, Managers, Operators — that collaborate in parallel and synthesize results.",
  },
  {
    icon: LayoutGrid,
    title: "Configurable Dashboards",
    description:
      "Choose Boards, Lists, or Workspace pathway. Drag-and-drop 10+ widget types. Four preset layouts per pathway, fully customizable.",
  },
  {
    icon: AlertTriangle,
    title: "Safety Signals",
    description:
      "Compliance bees raise hold signals when they spot risks. Swarm execution pauses for your review. You always have the final say.",
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
      "Your PA classifies the intent and scores complexity. Simple requests execute instantly. Complex ones dispatch a bee swarm that works in phased parallel and synthesizes results.",
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
  "Bee swarm intelligence",
  "Configurable dashboards & widgets",
  "Google, Outlook & Slack",
  "Morning briefings & digests",
  "Conversational reports",
  "PA learning & corrections",
];

const beeTypes = [
  {
    icon: Wrench,
    name: "Analyst Bee",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    description: "Scans data, gathers metrics, identifies trends",
  },
  {
    icon: Users,
    name: "Manager Bee",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    description: "Evaluates team capacity and workload balance",
  },
  {
    icon: Bot,
    name: "Assistant Bee",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    description: "Synthesizes results into a single clear answer",
  },
  {
    icon: Shield,
    name: "Compliance Bee",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    description: "Checks policies, flags risks, enforces guardrails",
  },
];

const pathways = [
  {
    icon: Columns3,
    title: "Boards",
    description:
      "Kanban columns for visual task flow. Drag cards between statuses.",
    footer: "4 preset layouts",
  },
  {
    icon: List,
    title: "Lists",
    description:
      "Sortable, filterable task tables with timeline and calendar views.",
    footer: "4 preset layouts",
  },
  {
    icon: LayoutDashboard,
    title: "Workspace",
    description:
      "Command center with metrics, chat, files, and live bee panel.",
    footer: "4 preset layouts",
  },
];

const widgetTypes = [
  "Board",
  "List",
  "Timeline",
  "Calendar",
  "Activity",
  "Metrics",
  "Team",
  "Files",
  "Chat",
  "Bee Panel",
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
                href="#bee-swarm"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Bee Swarm
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
                    Audit our Q1 launch readiness &mdash; check task completion,
                    team workload, and compliance risks
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
                    I&apos;ve dispatched a swarm for this. Analyst, Manager, and
                    Compliance bees are on it.
                  </div>
                </div>
                {/* Swarm mini-visualization */}
                <div className="mx-4 space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span className="text-muted-foreground">Analyst Bee</span>
                    <Check className="ml-auto size-3 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400" />
                    <span className="text-muted-foreground">Manager Bee</span>
                    <Check className="ml-auto size-3 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">
                      Compliance Bee
                    </span>
                    <Check className="ml-auto size-3 text-amber-400" />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
                    Launch readiness: 87% tasks complete, 3 blockers on design
                    track. Sarah at 120% capacity &mdash; I&apos;ve drafted a
                    rebalance. One flag: privacy review not signed off.
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
            <span>Bee Swarm Intelligence</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Voice-First</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Your Dashboards</span>
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

      {/* Bee Swarm Showcase */}
      <section
        id="bee-swarm"
        className="bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One request. Multiple AI specialists.
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Hive automatically dispatches the right AI agents for complex
              work &mdash; in parallel.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column — Bee types */}
            <div className="space-y-4">
              {beeTypes.map((bee) => (
                <div
                  key={bee.name}
                  className="flex items-start gap-4 rounded-lg border bg-background p-4"
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bee.bg}`}
                  >
                    <bee.icon className={`size-5 ${bee.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{bee.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {bee.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right column — Swarm flow card */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Swarm Execution</CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-500"
                >
                  Completed
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phase 0 — parallel */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Phase 0 &mdash; Parallel
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        Analyst Bee
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>1.2s</span>
                        <Check className="size-4 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-400" />
                        Compliance Bee
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>0.8s</span>
                        <Check className="size-4 text-amber-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow handover */}
                <div className="flex justify-center">
                  <ArrowDown className="size-5 text-muted-foreground" />
                </div>

                {/* Phase 1 */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Phase 1
                  </p>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-400" />
                      Manager Bee
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>1.5s</span>
                      <Check className="size-4 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Arrow handover */}
                <div className="flex justify-center">
                  <ArrowDown className="size-5 text-muted-foreground" />
                </div>

                {/* Synthesis */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Synthesis
                  </p>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-violet-400" />
                      Assistant Bee
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>0.6s</span>
                      <Check className="size-4 text-violet-400" />
                    </div>
                  </div>
                </div>

                {/* Result preview */}
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Result: 4 findings synthesized into executive summary
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Pathways */}
      <section
        id="dashboards"
        className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your workspace, your way
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Three pathways to organize work. Drag widgets, swap layouts, make
              it yours.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {pathways.map((pathway) => (
              <Card key={pathway.title} className="border-muted/60">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <pathway.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{pathway.title}</CardTitle>
                  <CardDescription>{pathway.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <span className="text-xs text-muted-foreground">
                    {pathway.footer}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            {widgetTypes.map((widget, i) => (
              <span key={widget}>
                {widget}
                {i < widgetTypes.length - 1 && (
                  <span className="ml-2">&middot;</span>
                )}
              </span>
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

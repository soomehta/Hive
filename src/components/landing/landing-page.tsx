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
      "Every teammate gets an assistant that learns their priorities, projects, and working style.",
  },
  {
    icon: Mic,
    title: "Voice-First Commands",
    description:
      "Speak to create tasks, check your schedule, and prep updates when your hands are full.",
  },
  {
    icon: Shield,
    title: "Graduated Autonomy",
    description:
      "Decide how hands-on you want to be: fully automatic, confirm before sending, or drafts only.",
  },
  {
    icon: MessageSquare,
    title: "Reports as Conversations",
    description:
      'Ask "What is blocking us?" and get a clear answer with context, not another dashboard to decode.',
  },
  {
    icon: Plug,
    title: "Smart Integrations",
    description:
      "Connect Google, Outlook, and Slack so your assistant can coordinate work across the tools you already use.",
  },
  {
    icon: Sun,
    title: "Morning Briefings",
    description:
      "Start your day with one focused plan: priorities, meetings, blockers, and what needs attention first.",
  },
  {
    icon: Bot,
    title: "Team-Style AI Support",
    description:
      "For bigger questions, Hive brings in specialized assistants that collaborate and return one clear recommendation.",
  },
  {
    icon: LayoutGrid,
    title: "Configurable Dashboards",
    description:
      "Pick a view that fits your team, then tailor your workspace with boards, lists, calendars, and more.",
  },
  {
    icon: AlertTriangle,
    title: "Safety Signals",
    description:
      "Risk checks pause sensitive actions and ask for your approval so nothing important happens without you.",
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
    title: "Hive Coordinates the Work",
    description:
      "Simple requests happen right away. Bigger requests are broken down, handled in parallel, and returned as one plan.",
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
    name: "Analyst Assistant",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    description: "Scans progress, gathers numbers, and spots trends",
  },
  {
    icon: Users,
    name: "Manager Assistant",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    description: "Checks team capacity and workload balance",
  },
  {
    icon: Bot,
    name: "Coordinator Assistant",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    description: "Turns findings into one clear recommendation",
  },
  {
    icon: Shield,
    name: "Compliance Assistant",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    description: "Checks policy risks before sensitive actions",
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

const heroStats = [
  { value: "70+", label: "Built-in routes" },
  { value: "10+", label: "Dashboard widgets" },
  { value: "3", label: "Workspace pathways" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                AI Teamwork
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
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute right-10 top-32 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 border border-primary/20 bg-primary/5 px-3 py-1 text-sm"
            >
              Project management that feels simpler
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Less busywork. More{" "}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                meaningful progress.
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Hive keeps everything you need in one place and gives every team
              member an AI assistant that helps plan, coordinate, and follow
              through. Talk to it or type naturally.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="w-full rounded-full px-7 sm:w-auto">
                <Link href="/sign-up">
                  Start Free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full rounded-full px-7 sm:w-auto"
              >
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-background/70 px-3 py-3 text-center shadow-sm"
              >
                <p className="text-lg font-semibold sm:text-xl">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mock PA Conversation */}
          <div className="mx-auto mt-16 max-w-lg">
            <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
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
                    Working on it. I am checking progress, team capacity, and
                    policy risks now.
                  </div>
                </div>
                {/* Swarm mini-visualization */}
                <div className="mx-4 space-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span className="text-muted-foreground">
                      Analyst Assistant
                    </span>
                    <Check className="ml-auto size-3 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400" />
                    <span className="text-muted-foreground">
                      Manager Assistant
                    </span>
                    <Check className="ml-auto size-3 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">
                      Compliance Assistant
                    </span>
                    <Check className="ml-auto size-3 text-amber-400" />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2 text-sm">
                    Launch readiness: 87% tasks complete, 3 blockers on design
                    track. Sarah is overloaded &mdash; I&apos;ve drafted a
                    rebalance. One flag: privacy review not signed off.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof / Philosophy */}
      <section className="border-y bg-gradient-to-b from-muted/40 to-muted/20 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-6 text-center text-sm font-medium text-muted-foreground sm:gap-10">
            <span>Bee Swarm Intelligence</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Voice-First</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>Your Workspace</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span>You Stay in Control</span>
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
              Everything your team needs to plan, communicate, and execute
              without hopping between five tools.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-muted/60 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/10">
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
        className="bg-gradient-to-b from-muted/30 to-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One question, backed by multiple specialists
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              When work gets complex, Hive coordinates focused assistants in the
              background and gives you one clear answer.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column — Bee types */}
            <div className="space-y-4">
              {beeTypes.map((bee) => (
                <div
                  key={bee.name}
                  className="flex items-start gap-4 rounded-lg border bg-background p-4 transition-colors hover:border-primary/40"
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
            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">How Hive Handles Complexity</CardTitle>
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
                    Step 1 &mdash; Parallel checks
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        Analyst Assistant
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>1.2s</span>
                        <Check className="size-4 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-amber-400" />
                        Compliance Assistant
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
                    Step 2 &mdash; Team context
                  </p>
                  <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-400" />
                      Manager Assistant
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
                    Step 3 &mdash; Final recommendation
                  </p>
                  <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-violet-400" />
                      Coordinator Assistant
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>0.6s</span>
                      <Check className="size-4 text-violet-400" />
                    </div>
                  </div>
                </div>

                {/* Result preview */}
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Result: a concise summary with findings, tradeoffs, and next
                  actions
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
              Start with a layout that fits your team and shape it as your
              workflows evolve.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {pathways.map((pathway) => (
              <Card
                key={pathway.title}
                className="border-muted/60 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/10">
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
            {widgetTypes.map((widget) => (
              <span
                key={widget}
                className="rounded-full border bg-muted/40 px-3 py-1"
              >
                {widget}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-y bg-gradient-to-b from-muted/30 to-muted/20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Tell Hive what you need and it takes care of the coordination.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <Card
                key={step.number}
                className="border-muted/60 bg-background/80 p-2 text-center shadow-sm"
              >
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
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
              Start free and upgrade when your team needs deeper automation.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Free Plan */}
            <Card className="border-muted/70 shadow-sm">
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
                <Button variant="outline" className="w-full rounded-full" asChild>
                  <Link href="/sign-up">Get Started Free</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary/40 bg-gradient-to-b from-primary/5 to-background shadow-xl shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>
                  Full assistant experience for growing teams
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
                <Button className="w-full rounded-full" asChild>
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
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-violet-500/10 px-6 py-12 text-center shadow-sm sm:px-10">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to make work feel lighter?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Join teams replacing status-chasing and busywork with clear
              priorities and steady progress.
            </p>
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
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

import { SignInButton } from "@clerk/clerk-react";
import {
  Leaf,
  Sprout,
  Ruler,
  Calendar,
  Sparkles,
  ArrowRight,
  Flower2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function LandingPage() {
  return (
    <div className="relative">
      {/* HERO: split layout with animated grid + floating preview cards */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute inset-0 -z-10 bg-grid-pattern animate-grid-pan opacity-40 mask-fade-edges" />
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 -z-10 h-[32rem] w-[64rem] rounded-full bg-emerald-100 blur-3xl opacity-40" />

        <div className="container mx-auto grid items-center gap-10 px-6 py-24 sm:grid-cols-12">
          {/* Left copy */}
          <div className="sm:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Leaf className="size-4 text-emerald-600" />
              Plant smarter, not harder
            </div>

            <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight text-emerald-900 sm:text-6xl">
              A living canvas for your garden vision
            </h1>
            <p className="mt-4 max-w-prose text-pretty text-muted-foreground">
              Sketch beds, arrange plants, and plan seasons with delightful
              micro‑interactions that keep you in flow.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <SignInButton mode="modal">
                <Button size="lg" className="px-8">
                  Start designing
                </Button>
              </SignInButton>
              <a
                href="#features"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                See how it works <ArrowRight className="size-4" />
              </a>
            </div>

            {/* Subtle marquee to add life */}
            <div className="relative mt-10 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap text-emerald-700/60">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className="mx-5 inline-flex items-center">
                    <Flower2 className="mr-2 size-4" /> Companion planting •
                    Mulch • Perennial • Seedling
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right floating cards preview */}
          <div className="relative sm:col-span-5">
            <Card className="group translate-y-2 border-emerald-100/60 bg-white/80 shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <Sprout className="size-5" /> Bed A
                </CardTitle>
                <CardDescription>Herbs + greens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md border bg-emerald-50/70 transition-colors duration-300 hover:bg-emerald-100"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="group absolute left-10 top-40 w-[85%] rotate-[-2deg] border-emerald-100/60 bg-white/80 shadow-sm transition-transform duration-300 ease-out hover:-translate-y-1 hover:rotate-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <Leaf className="size-5" /> Bed B
                </CardTitle>
                <CardDescription>Root veg + flowers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-8 gap-1.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-sm border bg-emerald-50/70 transition-transform duration-300 hover:scale-[1.02]"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* MOSAIC FEATURES: varied card sizes for a non-templated feel */}
      <section id="features" className="container mx-auto px-6 pb-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-3">
            Features
          </Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tools that feel tactile, not tedious
          </h2>
          <p className="mt-3 text-muted-foreground">
            Move fast with accuracy and a bit of joy.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-12 gap-6">
          <Card className="col-span-12 sm:col-span-5">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Ruler className="size-5" />
                <CardTitle>Dimension‑true layout</CardTitle>
              </div>
              <CardDescription>
                Dial in bed sizes so your plan matches your yard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border border-dashed bg-emerald-50" />
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-7">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Calendar className="size-5" />
                <CardTitle>Seasonal flows</CardTitle>
              </div>
              <CardDescription>
                Plan sowing, transplanting, and harvests with clarity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-center justify-between rounded-md border bg-white px-4 text-sm text-muted-foreground">
                <span>Spring → Summer → Fall</span>
                <Sparkles className="size-4 text-emerald-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-4">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Sprout className="size-5" />
                <CardTitle>Drag & place</CardTitle>
              </div>
              <CardDescription>
                Arrange plants with satisfying precision.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="col-span-12 sm:col-span-4">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Leaf className="size-5" />
                <CardTitle>Companion notes</CardTitle>
              </div>
              <CardDescription>
                Keep tips and varieties at hand.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="col-span-12 sm:col-span-4">
            <CardHeader>
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="size-5" />
                <CardTitle>Gentle guidance</CardTitle>
              </div>
              <CardDescription>Little nudges, never nagging.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="container mx-auto px-6 pb-28">
        <Card className="mx-auto max-w-5xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white">
          <CardHeader>
            <CardTitle className="text-2xl">
              Ready to grow something beautiful?
            </CardTitle>
            <CardDescription>
              Join gardeners planning with clarity and fun.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                No credit card required to start.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="px-8">
                  Start planning
                </Button>
              </SignInButton>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default LandingPage;

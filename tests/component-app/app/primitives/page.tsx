"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function PrimitiveFixture() {
  return <div className="flex min-w-0 flex-col items-start gap-4 p-4">
    <Sheet><SheetTrigger asChild><Button>Open sheet</Button></SheetTrigger>
      <SheetContent side="bottom"><SheetTitle>History fixture</SheetTitle><SheetDescription>Keyboard fixture</SheetDescription><Input aria-label="Sheet input" /></SheetContent>
    </Sheet>
    <Popover><PopoverTrigger asChild><Button>Open popover</Button></PopoverTrigger>
      <PopoverContent><Input aria-label="Popover input" /></PopoverContent>
    </Popover>
    <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild><Button>Tooltip trigger</Button></TooltipTrigger>
      <TooltipContent>Helpful description</TooltipContent></Tooltip></TooltipProvider>
    <Slider aria-label="Strength" min={0} max={10} defaultValue={[5]} className="w-full max-w-64" />
    <Switch aria-label="Enable setting" /><Checkbox aria-label="Select item" /><Toggle>Toggle mode</Toggle>
    <AlertDialog><AlertDialogTrigger asChild><Button>Confirm action</Button></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogTitle>Confirmation</AlertDialogTitle><AlertDialogDescription>Test only</AlertDialogDescription><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Confirm</AlertDialogAction></AlertDialogContent>
    </AlertDialog>
    <DropdownMenu><DropdownMenuTrigger asChild><Button>Open menu</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem>First</DropdownMenuItem><DropdownMenuItem>Second</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Button>Before skeleton</Button><Skeleton className="h-12 w-32" /><Button>After skeleton</Button>
  </div>;
}

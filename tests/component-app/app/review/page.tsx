import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import styles from "./review.module.css";

// Test-only arrangement of actual production wrappers. No replacement CSS or
// imitation of future controls. Keep layout in a route-local CSS module:
// fixture utility tokens would alter Tailwind automatic source detection and
// therefore the styles of the unrelated Create overflow acceptance route.
export default function ReviewPrimitives() {
  return <section aria-label="Shared primitive review" className={styles.specimen}>
    <h1 className={styles.heading}>Shared primitive review</h1>
    <Field>
      <FieldLabel htmlFor="review-input">Title</FieldLabel>
      <Input id="review-input" defaultValue="Synthetic title" placeholder="Enter a title" />
      <FieldDescription>Fixture data only.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel htmlFor="review-prompt">Prompt</FieldLabel>
      <Textarea id="review-prompt" defaultValue="A violet studio illustration" placeholder="Describe an image" />
    </Field>
    <Field orientation="horizontal">
      <Checkbox id="review-checkbox" defaultChecked />
      <FieldLabel htmlFor="review-checkbox">Selected</FieldLabel>
    </Field>
    <div className={styles.actions}>
      <Button>Primary</Button><Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button><Button disabled>Disabled</Button>
      <Toggle aria-label="Toggle sample" defaultPressed>Toggle</Toggle>
    </div>
    <Alert><AlertDescription>Synthetic status message.</AlertDescription></Alert>
    <Popover>
      <PopoverTrigger asChild><Button variant="secondary">Review popover</Button></PopoverTrigger>
      <PopoverContent className={styles.overlay}>
        <p>Real shared popover</p>
        <Button variant="ghost">Popover action</Button>
      </PopoverContent>
    </Popover>
  </section>;
}

/** Interactive primitives for the /design gallery. App-only; the primitives live in @zurichjs/design. */
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Modal } from '@zurichjs/design/islands/Modal';
import { StarRating } from '@zurichjs/design/islands/StarRating';

export default function IslandsDemo() {
  const [stars, setStars] = useState(4);
  const [empty, setEmpty] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <div class="grid gap-10 md:grid-cols-2">
      <div class="flex flex-col gap-6">
        <StarRating label="Rate the talk" value={stars} onChange={setStars} />
        <StarRating label="Rate the talk (required, not answered)" value={empty} onChange={setEmpty} invalid size="lg" />
      </div>
      <div class="flex flex-col gap-5">
        <TextField label="Name" name="demo-name" autocomplete="name" />
        <TextField label="Email" name="demo-email" hint="Only used to reply to you." type="email" />
        <TextField label="Talk title" name="demo-title" error="Add a title so we know what the talk is about." invalid />
        <TextArea label="What should we know?" name="demo-notes" rows={3} />
        <SelectField label="Format" name="demo-format">
          <option>Talk</option>
          <option>Lightning talk</option>
        </SelectField>
        <Checkbox label="I have read the code of conduct" name="demo-coc" />
      </div>
      <div class="flex flex-wrap gap-3 items-center">
        <Button onClick={() => setOpen(true)}>Open the modal</Button>
        <Button variant="outline-black" disabled>
          Disabled
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="demo-modal-title">
        <div class="flex flex-col gap-4 p-6">
          <h2 id="demo-modal-title" class="m-0 text-[26px] font-bold">
            A modal
          </h2>
          <p class="m-0 text-[18px] leading-[1.55]">Focus moves inside, Escape closes it, and focus returns to the button.</p>
          <Button variant="black" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}

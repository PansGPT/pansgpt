import { useState, type ReactNode } from "react";
import {
  AvatarLabelGroup,
  Badge,
  Button,
  CreditCardPreview,
  FileDropzone,
  FileUploadItem,
  Input,
  RadioGroup,
  Select,
  SlideoutSection,
  Textarea,
} from "../src";
import {
  SlideoutAsset,
  slideoutAssetUrl,
  type SlideoutAssetName,
} from "../src/components/slideout-assets";

function asset(index: number, suffix: string): SlideoutAssetName {
  return `source${index}_img${suffix}` as SlideoutAssetName;
}
function BillingContact({ index }: { index: number }): React.ReactElement {
  return (
    <SlideoutSection title="Billing contact" description="Add a second billing contact email.">
      <Input
        size="md"
        label="Email address"
        required
        type="email"
        defaultValue="accounts@PansGPT.com"
        leadingIcon={<SlideoutAsset name={asset(index, "Mail01")} />}
        help="Billing contact email"
      />
    </SlideoutSection>
  );
}
function PaymentDetails({ index, mobile }: { index: number; mobile: boolean }): React.ReactElement {
  return (
    <>
      <CreditCardPreview
        size={mobile ? "mobile" : "desktop"}
        background={slideoutAssetUrl(asset(index, "CardMockup"))}
        label="Example payment card"
        brand="PansGPT."
        holder="OLIVIA RHYE"
        number="1234 1234 1234 1234"
        expiry="06/28"
        contactlessIcon={<SlideoutAsset name={asset(index, "PayPassIcon")} />}
        paymentIcon={<SlideoutAsset name={asset(index, "Mastercard")} />}
      />
      <SlideoutSection>
        <Input
          label="Name on card"
          required
          size="md"
          autoComplete="cc-name"
          defaultValue="Diepreye Ọ̀rẹ̀kọ́yà"
        />
        <Input
          label="Card number"
          required
          size="md"
          inputMode="numeric"
          autoComplete="cc-number"
          defaultValue="1234 1234 1234 1234"
          leadingIcon={
            <span className="slideout-card-number-brand">
              <SlideoutAsset name={asset(index, "Mastercard1")} />
            </span>
          }
        />
        <div className="slideout-expiry-row">
          <Input label="Expiry" required size="md" autoComplete="cc-exp" defaultValue="06 / 2025" />
          <Input
            label="CVV"
            required
            size="md"
            autoComplete="cc-csc"
            type="password"
            defaultValue="123"
          />
        </div>
      </SlideoutSection>
      <hr />
      <BillingContact index={index} />
    </>
  );
}
function PaymentMethods({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [selected, setSelected] = useState("visa");
  const methods = [
    {
      id: "visa",
      label: "Visa ending in 1234",
      description: "Up to 10 users and 20 GB individual data.",
      icon: "PaymentMethodIcon",
    },
    {
      id: "mastercard",
      label: "Mastercard ending in 1234",
      description: "Up to 20 users and 40 GB individual data.",
      icon: "PaymentMethodIcon1",
    },
    {
      id: "apple",
      label: "Visa ending in 1234",
      description: "Unlimited users and unlimited individual data.",
      icon: "PaymentMethodIcon2",
    },
    {
      id: "stripe",
      label: "Stripe (Visa ending 1234)",
      description: "Unlimited users and unlimited individual data.",
    },
  ];
  return (
    <>
      <SlideoutSection>
        <RadioGroup
          label="Payment method"
          className="slideout-payment-methods"
          value={selected}
          onValueChange={setSelected}
          options={methods.map((method) => ({
            value: method.id,
            label: method.label,
            description: method.description,
            icon: method.icon ? (
              <SlideoutAsset name={asset(index, method.icon)} />
            ) : (
              <span className="slideout-stripe-logo">stripe</span>
            ),
            actions: (
              <>
                <Button
                  variant="link-gray"
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={() => {
                    setSelected(method.id);
                    onAction(`Default: ${method.id}`);
                  }}
                >
                  Set as default
                </Button>
                <Button
                  variant="link-color"
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={() => onAction(`Edit: ${method.id}`)}
                >
                  Edit
                </Button>
              </>
            ),
          }))}
        />
        <Button
          className="slideout-add-payment"
          variant="link-color"
          leadingIcon={<SlideoutAsset name={asset(index, "Plus")} />}
          trailingIcon={null}
          onClick={() => onAction("Add payment method")}
        >
          Add payment method
        </Button>
      </SlideoutSection>
      <hr />
      <BillingContact index={index} />
    </>
  );
}
function PlanContent({ index }: { index: number }): React.ReactElement {
  return (
    <RadioGroup
      variant="plans"
      label="Subscription plan"
      defaultValue="basic"
      options={[
        {
          value: "basic",
          label: "Basic plan",
          price: "$10",
          description: "Includes up to 10 users, 20 GB individual data and access to all features.",
          icon: "LayersTwo01",
        },
        {
          value: "business",
          label: "Business plan",
          price: "$20",
          description: "Includes up to 20 users, 40 GB individual data and access to all features.",
          icon: "LayersThree01",
        },
        {
          value: "enterprise",
          label: "Enterprise plan",
          price: "$40",
          description: "Unlimited users, unlimited individual data and access to all features.",
          icon: "Zap",
        },
      ].map((plan) => ({
        value: plan.value,
        label: plan.label,
        icon: <SlideoutAsset name={asset(index, plan.icon)} />,
        description: (
          <div className="slideout-plan-description">
            <div className="slideout-plan-price">
              <span>
                <strong>{plan.price}</strong> per month
              </span>
              {plan.value === "basic" && (
                <Badge size="sm" variant="modern" dot color="gray">
                  Limited time only
                </Badge>
              )}
            </div>
            <span>{plan.description}</span>
          </div>
        ),
      }))}
    />
  );
}
function ProjectDetails({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const initial = [
    { id: "chiamaka", name: "Ṣọ̀pẹ́ Emenike", email: "chiamaka@PansGPT.com", photo: "Avatar" },
    { id: "halima", name: "Ọ̀rẹ́fúnmi Àrẹ̀gbẹ́ṣọ́lá", email: "halima@PansGPT.com", initials: "DW" },
    { id: "emeka", name: "Ikenna Danjuma", email: "emeka@PansGPT.com", photo: "Avatar1" },
  ];
  const [members, setMembers] = useState(initial);
  const [copied, setCopied] = useState(false);
  return (
    <>
      <SlideoutSection title="Share project">
        <a className="slideout-project-link" href="https://PansGPT.com/project/marketing-site">
          <SlideoutAsset name={asset(index, "Link01")} />
          PansGPT.com/project/marketing-site
        </a>
        <Button
          variant="secondary"
          leadingIcon={<SlideoutAsset name={asset(index, "Copy01")} />}
          trailingIcon={null}
          onClick={() => {
            void navigator.clipboard.writeText("https://PansGPT.com/project/marketing-site").then(
              () => setCopied(true),
              () => onAction("Unable to copy link")
            );
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
      </SlideoutSection>
      <SlideoutSection>
        <Input label="Name of project" required size="md" defaultValue="Marketing site redesign" />
        <Textarea
          label="Description"
          help="Project description"
          defaultValue="A little about the company and the team that you’ll be working with."
        />
        <Select
          label="Project status"
          size="md"
          defaultValue="progress"
          options={[
            {
              value: "progress",
              label: "In progress",
              leading: <SlideoutAsset name={asset(index, "SizeMdOutlineFalse")} />,
            },
            { value: "complete", label: "Complete" },
            { value: "planned", label: "Planned" },
          ]}
          trailingIcon={<SlideoutAsset name={asset(index, "ChevronDown")} />}
        />
      </SlideoutSection>
      <SlideoutSection
        title="Team members"
        description="The following are working on this project."
      >
        <ul className="slideout-member-list">
          {members.map((member) => (
            <li key={member.id}>
              <AvatarLabelGroup
                size="md"
                name={member.name}
                supportingText={member.email}
                avatar={{
                  label: member.name,
                  src: member.photo ? slideoutAssetUrl(asset(index, member.photo)) : undefined,
                  initials: member.initials,
                }}
              />
              <Button
                variant="link-gray"
                destructive
                leadingIcon={null}
                trailingIcon={null}
                aria-label={`Remove ${member.name}`}
                onClick={() =>
                  setMembers((previous) => previous.filter((item) => item.id !== member.id))
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="link-color"
          leadingIcon={<SlideoutAsset name={asset(index, "Plus")} />}
          trailingIcon={null}
          onClick={() => onAction("Add team member")}
        >
          Add team member
        </Button>
      </SlideoutSection>
    </>
  );
}
function OrderSummary({
  index,
  onAction,
}: {
  index: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [shipping, setShipping] = useState("express");
  const [code, setCode] = useState("FRIENDS");
  return (
    <>
      <div className="slideout-summary-total">
        <Badge dot variant="modern" size="md" color="gray">
          4 items
        </Badge>
        <strong>$49.00</strong>
      </div>
      <hr />
      <SlideoutSection>
        <Select
          label="Shipping method"
          size="md"
          value={shipping}
          onValueChange={setShipping}
          trailingIcon={<SlideoutAsset name={asset(index, "ChevronDown")} />}
          options={[
            { value: "express", label: "Express post  +$3.99" },
            { value: "standard", label: "Standard post" },
          ]}
        />
        <div className="slideout-discount-row">
          <Input
            label="Discount code"
            size="md"
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
          />
          <Button
            iconOnly
            size="lg"
            variant="secondary"
            aria-label="Copy discount code"
            leadingIcon={<SlideoutAsset name={asset(index, "Copy07")} />}
            onClick={() => {
              void navigator.clipboard.writeText(code).then(
                () => onAction("Discount copied"),
                () => onAction("Unable to copy discount")
              );
            }}
          />
        </div>
      </SlideoutSection>
      <hr />
      <SlideoutSection>
        <dl className="slideout-summary-lines">
          <div>
            <dt>
              Discount{" "}
              <Badge variant="modern" size="md" color="gray">
                {code}
              </Badge>
            </dt>
            <dd>10% ($4.90)</dd>
          </div>
          <div>
            <dt>{shipping === "express" ? "Express shipping" : "Standard shipping"}</dt>
            <dd>{shipping === "express" ? "$3.99" : "$0.00"}</dd>
          </div>
          <div>
            <dt>Subtotal</dt>
            <dd>{shipping === "express" ? "$48.09" : "$44.10"}</dd>
          </div>
        </dl>
        <hr />
        <Button
          size="md"
          className="slideout-checkout"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => onAction("Continue to checkout")}
        >
          Continue to checkout
        </Button>
      </SlideoutSection>
    </>
  );
}
function UploadContent({
  mobile,
  onAction,
}: {
  mobile: boolean;
  onAction: (value: string) => void;
}): React.ReactElement {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [files, setFiles] = useState<readonly File[]>([]);
  return (
    <SlideoutSection>
      <FileDropzone
        onFilesSelected={setFiles}
        accept="image/*,.svg"
        inputLabel="Attach project files"
        hint="SVG, PNG, JPG or GIF (max. 800x400px)"
        state={mobile ? "default" : "hover"}
        onFilesRejected={(rejections) => onAction(`${rejections.length} files rejected`)}
      />
      {[
        {
          fileName: "Tech design requirements.pdf",
          sizeLabel: "200 KB",
          fileType: "pdf" as const,
          progress: 100,
          status: "complete" as const,
        },
        {
          fileName: "Dashboard prototype.mp4",
          sizeLabel: "16 MB",
          fileType: "mp4" as const,
          progress: 40,
          status: "uploading" as const,
        },
        {
          fileName: "Dashboard prototype FINAL.fig",
          sizeLabel: "4.2 MB",
          fileType: "fig" as const,
          progress: 80,
          status: "uploading" as const,
        },
      ]
        .filter((file) => !removed.has(file.fileName))
        .map((file) => (
          <FileUploadItem
            key={file.fileName}
            {...file}
            variant="fill"
            onRemove={() => setRemoved((previous) => new Set([...previous, file.fileName]))}
          />
        ))}
      {files.map((file, position) => (
        <FileUploadItem
          key={`${file.name}-${position}`}
          fileName={file.name}
          sizeLabel={`${file.size} bytes`}
          fileType="jpg"
          variant="fill"
          progress={0}
          onRemove={() => setFiles((previous) => previous.filter((_, index) => index !== position))}
        />
      ))}
    </SlideoutSection>
  );
}
export function SlideoutDetailContent({
  type,
  index,
  mobile,
  onAction,
}: {
  type: string;
  index: number;
  mobile: boolean;
  onAction: (value: string) => void;
}): ReactNode {
  if (type === "Payment details") return <PaymentDetails index={index} mobile={mobile} />;
  if (type === "Payment method") return <PaymentMethods index={index} onAction={onAction} />;
  if (type === "Plan") return <PlanContent index={index} />;
  if (type === "Project details") return <ProjectDetails index={index} onAction={onAction} />;
  if (type === "Order summary") return <OrderSummary index={index} onAction={onAction} />;
  if (type === "File upload") return <UploadContent mobile={mobile} onAction={onAction} />;
  return null;
}

export type ControlLayoutNode = {
  text?: string;
  tag?: string;
  name?: string | null;
  style?: string;
  asset?: string | null;
  id?: string | null;
  children?: ControlLayoutNode[];
};
export type ControlLayoutSource = {
  id: string;
  familyId: string;
  index: number;
  name: string;
  width: number;
  height: number;
  nodes: ControlLayoutNode[];
};
export const controlLayouts: ControlLayoutSource[] = [
  {
    id: "3281:380430",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Default, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Default, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380430",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406495",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "3281:380431",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "3281:380432",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "3281:380433",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138924",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Default, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Default, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138924",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138925",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "7953:138926",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "7953:138927",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "7953:138928",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380437",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Default, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Default, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380437",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406603",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "3281:380438",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "3281:380439",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "3281:380440",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380441",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138929",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Default, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Default, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138929",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138930",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "7953:138931",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "7953:138932",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "7953:138933",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138934",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380462",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Default, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Default, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380462",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406602",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "3281:380463",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0",
                    asset: null,
                    id: "3281:380464",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0",
                    asset: null,
                    id: "3281:380465",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138935",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Default, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Default, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138935",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138936",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "7953:138937",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0",
                    asset: null,
                    id: "7953:138938",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0",
                    asset: null,
                    id: "7953:138939",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380469",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Default, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Default, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380469",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406618",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "3281:380470",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0",
                    asset: null,
                    id: "3281:380471",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0",
                    asset: null,
                    id: "3281:380472",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380473",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138940",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Default, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Default, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138940",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138941",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "7953:138942",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0",
                    asset: null,
                    id: "7953:138943",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0",
                    asset: null,
                    id: "7953:138944",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138945",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380478",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Default, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Default, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380478",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406600",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "3281:380479",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "3281:380480",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "3281:380481",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138946",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Default, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Default, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138946",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138947",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[length:var(--font-size\\/text-md,16px)] w-full whitespace-nowrap",
                asset: null,
                id: "7953:138948",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "7953:138949",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "7953:138950",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380485",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Default, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Default, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380485",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406616",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "3281:380486",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "3281:380487",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "3281:380488",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380489",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138951",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Default, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Default, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138951",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138952",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                asset: null,
                id: "7953:138953",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)]",
                    asset: null,
                    id: "7953:138954",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)]",
                    asset: null,
                    id: "7953:138955",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138956",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380494",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Icon leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Icon leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380494",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406634",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380495",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380497",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380498",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138957",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Icon leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Icon leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138957",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138958",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:138959",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138961",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138962",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380503",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Icon leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Icon leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380503",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406622",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380504",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380506",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380507",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380508",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138963",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Icon leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Icon leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138963",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138964",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:138965",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138967",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138968",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138969",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380534",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Icon leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Icon leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380534",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406631",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380535",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380537",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380538",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138970",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Icon leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Icon leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138970",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138971",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:138972",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138974",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138975",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380543",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Icon leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Icon leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380543",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406619",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380544",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380546",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380547",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380548",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138976",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Icon leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Icon leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138976",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138977",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:138978",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138980",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138981",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138982",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380554",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Icon leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Icon leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380554",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406633",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380555",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380557",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380558",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138983",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Icon leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Icon leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138983",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138984",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:138985",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138987",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138988",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380563",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Icon leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Icon leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380563",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406621",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380564",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380566",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380567",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380568",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138989",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Icon leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Icon leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138989",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138990",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:138991",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138993",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:138994",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:138995",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380574",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Avatar leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Avatar leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380574",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406713",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380575",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380577",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380578",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:138996",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Avatar leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Avatar leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:138996",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:138997",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:138998",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139000",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139001",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380583",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Avatar leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Avatar leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380583",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406842",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380584",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380586",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380587",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380588",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139002",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Avatar leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Avatar leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139002",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139003",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139004",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139006",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139007",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139008",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380614",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Avatar leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Avatar leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380614",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406841",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380615",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380617",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380618",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139009",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Avatar leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Avatar leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139009",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139010",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:139011",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139013",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139014",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380623",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Avatar leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Avatar leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380623",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406866",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380624",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380626",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380627",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380628",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139015",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Avatar leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Avatar leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139015",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139016",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139017",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139019",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139020",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139021",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380634",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Avatar leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Avatar leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380634",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406839",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380635",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380637",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380638",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139022",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Avatar leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Avatar leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139022",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139023",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:139024",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139026",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139027",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380643",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Avatar leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Avatar leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380643",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406864",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380644",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380646",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380647",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380648",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139028",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Avatar leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Avatar leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139028",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139029",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139030",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style:
                      "border-[0.5px] border-[rgba(0,0,0,0.08)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[24px]",
                    asset: null,
                    id: "19:1011",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style:
                          "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-full,9999px)] size-full",
                        asset: "source0_imgSizeXsPlaceholderFalseTextFalseStatusIconFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139032",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139033",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139034",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380655",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Dot leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Dot leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380655",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406867",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380656",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380658",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380659",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139035",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Dot leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Dot leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139035",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139036",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:139037",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139039",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139040",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380664",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Dot leading, State=Default",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Dot leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380664",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406949",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380665",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380667",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380668",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380669",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139041",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Dot leading, State=Default",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Dot leading, State=Default",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139041",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139042",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139043",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139045",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139046",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139047",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380695",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Dot leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Dot leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380695",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406948",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380696",
                children: [
                  {
                    tag: "div",
                    name: "_Dot",
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "3281:380697",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgDot",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380698",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380699",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139048",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Dot leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Dot leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139048",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139049",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:139050",
                children: [
                  {
                    tag: "div",
                    name: "_Dot",
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "7953:139051",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgDot",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139052",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139053",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380704",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Dot leading, State=Disabled",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Dot leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380704",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406960",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380705",
                children: [
                  {
                    tag: "div",
                    name: "_Dot",
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "3281:380706",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgDot",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380707",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380708",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380709",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139054",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Dot leading, State=Disabled",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Dot leading, State=Disabled",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139054",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-active,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139055",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139056",
                children: [
                  {
                    tag: "div",
                    name: "_Dot",
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "7953:139057",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgDot",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139058",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139059",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139060",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380715",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=False, Type=Dot leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=False, Type=Dot leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380715",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406946",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "3281:380716",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380718",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380719",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139061",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=False, Type=Dot leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=False, Type=Dot leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139061",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-w-px overflow-clip p-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139062",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex gap-[var(--spacing-md,8px)] items-center relative shrink-0 w-full",
                asset: null,
                id: "7953:139063",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139065",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139066",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3281:380724",
    familyId: "3281:380429",
    index: 0,
    name: "Size=md, Selected=True, Type=Dot leading, State=Hover",
    width: 320,
    height: 46,
    nodes: [
      {
        tag: "div",
        name: "Size=md, Selected=True, Type=Dot leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "3281:380724",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[10px] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "3930:406958",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "3281:380725",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380727",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "3281:380728",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[20px]",
                asset: null,
                id: "3281:380729",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7953:139067",
    familyId: "3281:380429",
    index: 0,
    name: "Size=sm, Selected=True, Type=Dot leading, State=Hover",
    width: 320,
    height: 42,
    nodes: [
      {
        tag: "div",
        name: "Size=sm, Selected=True, Type=Dot leading, State=Hover",
        style:
          "content-stretch flex items-center px-[var(--spacing-sm,6px)] py-px relative w-[320px]",
        asset: null,
        id: "7953:139067",
        children: [
          {
            tag: "div",
            name: "Content",
            style:
              "bg-[var(--colors\\/background\\/bg-primary_hover,#fafafa)] content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px overflow-clip pl-[var(--spacing-md,8px)] pr-[10px] py-[var(--spacing-md,8px)] relative rounded-[var(--radius-sm,8px)]",
            asset: null,
            id: "7953:139068",
            children: [
              {
                tag: "div",
                name: "Text and supporting text",
                style:
                  "content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-center min-w-px relative",
                asset: null,
                id: "7953:139069",
                children: [
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[10px]",
                    asset: null,
                    id: "1046:10693",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source0_imgSizeMdOutlineFalse",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139071",
                    children: [
                      {
                        text: "Diepreye Ọ̀rẹ̀kọ́yà",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                    asset: null,
                    id: "7953:139072",
                    children: [
                      {
                        text: "@olivia",
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "check",
                style: "relative shrink-0 size-[16px]",
                asset: null,
                id: "7953:139073",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source0_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:362",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=False, State=Placeholder",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=False, State=Placeholder",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:362",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380525",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534740",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380526",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538324",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380527",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380528",
                    children: [
                      {
                        text: "Enter a description...",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72289",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380529",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407945",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=False, State=Placeholder",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=False, State=Placeholder",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407945",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407946",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534735",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407947",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538859",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:407948",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] min-h-px min-w-full relative text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left w-[min-content]",
                    asset: null,
                    id: "3309:409058",
                    children: [
                      {
                        text: "Add tags...",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72894",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407950",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:888",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=True, State=Placeholder",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=True, State=Placeholder",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:888",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380465",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534739",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380466",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538863",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-error_subtle,#fda29b)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380467",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380468",
                    children: [
                      {
                        text: "Enter a description...",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72882",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380469",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407951",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=True, State=Placeholder",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=True, State=Placeholder",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407951",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407952",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534738",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407953",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538862",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-error_subtle,#fda29b)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:409059",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] min-h-px min-w-full relative text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left w-[min-content]",
                    asset: null,
                    id: "3309:409060",
                    children: [
                      {
                        text: "Add tags...",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72897",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407956",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:360",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=False, State=Disabled",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Destructive=False, State=Disabled",
        style:
          "content-stretch flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:360",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380519",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534727",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] whitespace-nowrap",
                    asset: null,
                    id: "3285:380520",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] whitespace-nowrap",
                    asset: null,
                    id: "7487:538853",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380521",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)]",
                    asset: null,
                    id: "3285:380522",
                    children: [
                      {
                        text: "Enter a description...",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72891",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] w-full z-[1]",
            asset: null,
            id: "3285:380523",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407957",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=False, State=Disabled",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "div",
        name: "Type=Tags, Destructive=False, State=Disabled",
        style:
          "content-stretch flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407957",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407958",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534731",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] whitespace-nowrap",
                    asset: null,
                    id: "3309:407959",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] whitespace-nowrap",
                    asset: null,
                    id: "7487:538861",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:409042",
                children: [
                  {
                    tag: "div",
                    name: "Content",
                    style:
                      "content-start flex flex-wrap gap-[var(--spacing-md,8px)] items-start relative shrink-0 w-full",
                    asset: null,
                    id: "3309:409043",
                    children: [
                      {
                        tag: "div",
                        name: "Tags",
                        style:
                          "content-stretch flex gap-[var(--spacing-sm,6px)] items-center relative shrink-0",
                        asset: null,
                        id: "3309:409044",
                        children: [
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409045",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409045;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409045;3307:418116",
                                    children: [
                                      {
                                        text: "Design",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409046",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409046;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409046;3307:418116",
                                    children: [
                                      {
                                        text: "Software",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        name: null,
                        style:
                          "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-disabled,#717680)] text-[length:var(--font-size\\/text-md,16px)] whitespace-nowrap",
                        asset: null,
                        id: "3309:409047",
                        children: [
                          {
                            text: "Add tags...",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72912",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] w-full z-[1]",
            asset: null,
            id: "3309:407962",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:358",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=False, State=Default",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=False, State=Default",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:358",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380477",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534728",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380478",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538865",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380479",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380480",
                    children: [
                      {
                        text: "A little about the company and the team that you’ll be working with.",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72876",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380481",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407963",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=False, State=Default",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=False, State=Default",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407963",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407964",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534730",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407965",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538855",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:408025",
                children: [
                  {
                    tag: "div",
                    name: "Content",
                    style:
                      "content-start flex flex-wrap gap-[var(--spacing-md,8px)] items-start relative shrink-0 w-full",
                    asset: null,
                    id: "3309:408027",
                    children: [
                      {
                        tag: "div",
                        name: "Tags",
                        style:
                          "content-stretch flex gap-[var(--spacing-sm,6px)] items-center relative shrink-0",
                        asset: null,
                        id: "3309:408029",
                        children: [
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:408030",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:408030;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:408030;3307:418116",
                                    children: [
                                      {
                                        text: "Design",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:408031",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:408031;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:408031;3307:418116",
                                    children: [
                                      {
                                        text: "Software",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        name: null,
                        style:
                          "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left whitespace-nowrap",
                        asset: null,
                        id: "3309:408032",
                        children: [
                          {
                            text: "Add tags...",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72903",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407968",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:862",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=True, State=Default",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=True, State=Default",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:862",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380471",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534736",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380472",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538860",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-error_subtle,#fda29b)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380473",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380474",
                    children: [
                      {
                        text: "A little about the company and the team that you’ll be working with.",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72879",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380475",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407969",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=True, State=Default",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=True, State=Default",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407969",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407970",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534733",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407971",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538858",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-error_subtle,#fda29b)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:409061",
                children: [
                  {
                    tag: "div",
                    name: "Content",
                    style:
                      "content-start flex flex-wrap gap-[var(--spacing-md,8px)] items-start relative shrink-0 w-full",
                    asset: null,
                    id: "3309:409062",
                    children: [
                      {
                        tag: "div",
                        name: "Tags",
                        style:
                          "content-stretch flex gap-[var(--spacing-sm,6px)] items-center relative shrink-0",
                        asset: null,
                        id: "3309:409063",
                        children: [
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409064",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409064;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409064;3307:418116",
                                    children: [
                                      {
                                        text: "Design",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409065",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409065;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409065;3307:418116",
                                    children: [
                                      {
                                        text: "Software",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        name: null,
                        style:
                          "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left whitespace-nowrap",
                        asset: null,
                        id: "3309:409066",
                        children: [
                          {
                            text: "Add tags...",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[5px] right-[5px] size-[12px]",
                    asset: null,
                    id: "7588:72900",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407974",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:356",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=False, State=Focused",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=False, State=Focused",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:356",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380459",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534732",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380460",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538864",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border-2 border-[var(--colors\\/border\\/border-brand,#17b26a)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380461",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380462",
                    children: [
                      {
                        text: "A little about the company and the team that you’ll be working with.",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[4px] right-[4px] size-[12px]",
                    asset: null,
                    id: "7588:72885",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380463",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407975",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=False, State=Focused",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=False, State=Focused",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407975",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407976",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534729",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407977",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538856",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border-2 border-[var(--colors\\/border\\/border-brand,#17b26a)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:408979",
                children: [
                  {
                    tag: "div",
                    name: "Content",
                    style:
                      "content-start flex flex-wrap gap-[var(--spacing-md,8px)] items-start relative shrink-0 w-full",
                    asset: null,
                    id: "3309:408980",
                    children: [
                      {
                        tag: "div",
                        name: "Tags",
                        style:
                          "content-stretch flex gap-[var(--spacing-sm,6px)] items-center relative shrink-0",
                        asset: null,
                        id: "3309:408981",
                        children: [
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:408982",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:408982;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:408982;3307:418116",
                                    children: [
                                      {
                                        text: "Design",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:408983",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:408983;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:408983;3307:418116",
                                    children: [
                                      {
                                        text: "Software",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        name: null,
                        style:
                          "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left whitespace-nowrap",
                        asset: null,
                        id: "3309:408984",
                        children: [
                          {
                            text: "Add tags...",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[4px] right-[4px] size-[12px]",
                    asset: null,
                    id: "7588:72909",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407980",
            children: [
              {
                text: "This is a hint text to help user.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1238:876",
    familyId: "1238:278",
    index: 1,
    name: "Type=Default, Destructive=True, State=Focused",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Destructive=True, State=Focused",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "1238:876",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3285:380453",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534734",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3285:380454",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538857",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border-2 border-[var(--colors\\/border\\/border-error,#f04438)] border-solid content-stretch flex flex-[1_0_0] gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip px-[14px] py-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3285:380455",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal h-full leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[color:var(--colors\\/text\\/text-primary-\\(900\\),#181d27)] text-[length:var(--font-size\\/text-md,16px)] text-left",
                    asset: null,
                    id: "3285:380456",
                    children: [
                      {
                        text: "A little about the company and the team that you’ll be working with.",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[4px] right-[4px] size-[12px]",
                    asset: null,
                    id: "7588:72888",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3285:380457",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "3309:407981",
    familyId: "1238:278",
    index: 1,
    name: "Type=Tags, Destructive=True, State=Focused",
    width: 320,
    height: 180,
    nodes: [
      {
        tag: "button",
        name: "Type=Tags, Destructive=True, State=Focused",
        style:
          "content-stretch cursor-pointer flex flex-col gap-[var(--spacing-sm,6px)] h-[180px] isolate items-start relative w-[320px]",
        asset: null,
        id: "3309:407981",
        children: [
          {
            tag: "div",
            name: "Input with label",
            style:
              "content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-sm,6px)] items-start min-h-px relative w-full z-[2]",
            asset: null,
            id: "3309:407982",
            children: [
              {
                tag: "div",
                name: "Label wrapper",
                style:
                  "content-stretch flex gap-[var(--spacing-xxs,2px)] items-center relative shrink-0",
                asset: null,
                id: "7487:534737",
                children: [
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "3309:407983",
                    children: [
                      {
                        text: "Description",
                      },
                    ],
                  },
                  {
                    tag: "p",
                    name: null,
                    style:
                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-brand-tertiary-\\(600\\),#079455)] text-[length:var(--font-size\\/text-sm,14px)] text-left whitespace-nowrap",
                    asset: null,
                    id: "7487:538854",
                    children: [
                      {
                        text: "*",
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: null,
                    style: "relative shrink-0 size-[16px]",
                    asset: null,
                    id: "1054:7",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgOpenFalseSupportingTextFalseTooltipTopNoArrow",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              {
                tag: "div",
                name: "Input",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border-2 border-[var(--colors\\/border\\/border-error,#f04438)] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-md,8px)] items-start min-h-px overflow-clip p-[var(--spacing-lg,12px)] relative rounded-[var(--radius-md,12px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] w-full",
                asset: null,
                id: "3309:409077",
                children: [
                  {
                    tag: "div",
                    name: "Content",
                    style:
                      "content-start flex flex-wrap gap-[var(--spacing-md,8px)] items-start relative shrink-0 w-full",
                    asset: null,
                    id: "3309:409078",
                    children: [
                      {
                        tag: "div",
                        name: "Tags",
                        style:
                          "content-stretch flex gap-[var(--spacing-sm,6px)] items-center relative shrink-0",
                        asset: null,
                        id: "3309:409079",
                        children: [
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409080",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409080;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409080;3307:418116",
                                    children: [
                                      {
                                        text: "Design",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            tag: "div",
                            name: "Tag",
                            style:
                              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid content-stretch flex gap-[3px] items-center justify-center pl-[9px] pr-[var(--spacing-xs,4px)] py-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-sm,8px)] shrink-0",
                            asset: null,
                            id: "3309:409081",
                            children: [
                              {
                                tag: "div",
                                name: "Content",
                                style: "content-stretch flex items-center relative shrink-0",
                                asset: null,
                                id: "I3309:409081;3309:406971",
                                children: [
                                  {
                                    tag: "p",
                                    name: null,
                                    style:
                                      "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] text-[length:var(--font-size\\/text-sm,14px)] text-center whitespace-nowrap",
                                    asset: null,
                                    id: "I3309:409081;3307:418116",
                                    children: [
                                      {
                                        text: "Software",
                                      },
                                    ],
                                  },
                                ],
                              },
                              {
                                tag: "div",
                                name: null,
                                style:
                                  "content-stretch flex flex-col items-start overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[3px] shrink-0",
                                asset: null,
                                id: "3307:417720",
                                children: [
                                  {
                                    tag: "div",
                                    name: "x-close",
                                    style: "relative shrink-0 size-[12px]",
                                    asset: null,
                                    id: "3307:417721",
                                    children: [
                                      {
                                        tag: "img",
                                        name: null,
                                        style: "absolute block inset-0 max-w-none size-full",
                                        asset: "source1_imgXClose",
                                        id: null,
                                        children: [],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        name: null,
                        style:
                          "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-md,24px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-placeholder,#717680)] text-[length:var(--font-size\\/text-md,16px)] text-left whitespace-nowrap",
                        asset: null,
                        id: "3309:409082",
                        children: [
                          {
                            text: "Add tags...",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    name: "Resize handle",
                    style: "absolute bottom-[4px] right-[4px] size-[12px]",
                    asset: null,
                    id: "7588:72906",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source1_imgResizeHandle1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "p",
            name: null,
            style:
              "[word-break:break-word] font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal leading-[var(--line-height\\/text-sm,20px)] relative shrink-0 text-[color:var(--colors\\/text\\/text-error-primary-\\(600\\),#d92d20)] text-[length:var(--font-size\\/text-sm,14px)] text-left w-full z-[1]",
            asset: null,
            id: "3309:407986",
            children: [
              {
                text: "This is an error message.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "122:3305",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=md, State=Focus",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[44px]",
        asset: null,
        id: "122:3305",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239541",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539305",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=md, State=Focus",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[40px]",
        asset: null,
        id: "7923:539305",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539306",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4110",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=sm, State=Focus",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[36px]",
        asset: null,
        id: "1102:4110",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239172",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539307",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=sm, State=Focus",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[32px]",
        asset: null,
        id: "7923:539307",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539308",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "122:3303",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=md, State=Hover",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Pressed=True, Size=md, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "122:3303",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239539",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539309",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=md, State=Hover",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Type=Slim, Pressed=True, Size=md, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539309",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539310",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4104",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=sm, State=Hover",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Pressed=True, Size=sm, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4104",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239171",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539311",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=sm, State=Hover",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Type=Slim, Pressed=True, Size=sm, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539311",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539312",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "122:3301",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=md, State=Default",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "122:3301",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239542",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539313",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=md, State=Default",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539313",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539314",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4096",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=sm, State=Default",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4096",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239173",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539315",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=sm, State=Default",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539315",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539316",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1101:105294",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=md, State=Disabled",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "1101:105294",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239588",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539317",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=md, State=Disabled",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539317",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539429",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539318",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4106",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=True, Size=sm, State=Disabled",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4106",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239168",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539319",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=True, Size=sm, State=Disabled",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539319",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539383",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539320",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "122:3297",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=md, State=Focus",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[44px]",
        asset: null,
        id: "122:3297",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239537",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539321",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=md, State=Focus",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[40px]",
        asset: null,
        id: "7923:539321",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539417",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539322",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4098",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=sm, State=Focus",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[36px]",
        asset: null,
        id: "1102:4098",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239162",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539323",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=sm, State=Focus",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, State=Focus",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] w-[32px]",
        asset: null,
        id: "7923:539323",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539338",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539324",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "122:3295",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=md, State=Hover",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Pressed=False, Size=md, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "122:3295",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239540",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539325",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=md, State=Hover",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Type=Slim, Pressed=False, Size=md, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539325",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539411",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539326",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4088",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=sm, State=Hover",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Type=Default, Pressed=False, Size=sm, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4088",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239159",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539327",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=sm, State=Hover",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Type=Slim, Pressed=False, Size=sm, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539327",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539340",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539328",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "122:3293",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=md, State=Default",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "122:3293",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239538",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539329",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=md, State=Default",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539329",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539398",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539330",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4084",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=sm, State=Default",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4084",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:238901",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539331",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=sm, State=Default",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539331",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539341",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539332",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1101:105292",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=md, State=Disabled",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[44px]",
        asset: null,
        id: "1101:105292",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
            asset: null,
            id: "6305:239583",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539333",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=md, State=Disabled",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] w-[40px]",
        asset: null,
        id: "7923:539333",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539423",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
            asset: null,
            id: "7923:539334",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4090",
    familyId: "122:3294",
    index: 2,
    name: "Type=Default, Pressed=False, Size=sm, State=Disabled",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] w-[36px]",
        asset: null,
        id: "1102:4090",
        children: [
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
            asset: null,
            id: "6305:239165",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539335",
    familyId: "122:3294",
    index: 2,
    name: "Type=Slim, Pressed=False, Size=sm, State=Disabled",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] w-[32px]",
        asset: null,
        id: "7923:539335",
        children: [
          {
            tag: "div",
            name: "Border",
            style:
              "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "7923:539342",
            children: [],
          },
          {
            tag: "div",
            name: "Button",
            style:
              "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
            asset: null,
            id: "7923:539336",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4176",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=False, State=Focus",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4176",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3305",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239541",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539655",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Focus",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539655",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539305",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539306",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4430",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=True, State=Focus",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4430",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3305",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239541",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4491",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4492",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4493",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539657",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Focus",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539657",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539862",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=md, State=Focus",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-full",
                asset: null,
                id: "7923:539305",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539306",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539659",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539660",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539661",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4177",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Focus",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4177",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4110",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239172",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539662",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Focus",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539662",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539307",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539308",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4424",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Focus",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4424",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4110",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239172",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4464",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4465",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4466",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539664",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Focus",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539664",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539859",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=sm, State=Focus",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-full",
                asset: null,
                id: "7923:539307",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539308",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539666",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539667",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539668",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4180",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=False, State=Hover",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4180",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=True, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3303",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239539",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539669",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Hover",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539669",
        children: [
          {
            tag: "button",
            name: "Type=Slim, Pressed=True, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539309",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539310",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4418",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4418",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=True, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3303",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239539",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4482",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4483",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4484",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539671",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539671",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539864",
            children: [
              {
                tag: "button",
                name: "Type=Slim, Pressed=True, Size=md, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539309",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539310",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539673",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539674",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539675",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4181",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Hover",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4181",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=True, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4104",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239171",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539676",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Hover",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539676",
        children: [
          {
            tag: "button",
            name: "Type=Slim, Pressed=True, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539311",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539312",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4412",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4412",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=True, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4104",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239171",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4458",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4459",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4460",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539678",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539678",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539858",
            children: [
              {
                tag: "button",
                name: "Type=Slim, Pressed=True, Size=sm, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid_hover,#067647)] content-stretch cursor-pointer flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539311",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed-hover,#067647)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539312",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539680",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539681",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539682",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4184",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=False, State=Default",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4184",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3301",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239542",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539683",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Default",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539683",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539313",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539314",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4406",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4406",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3301",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239542",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4476",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4477",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4478",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539685",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539685",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539851",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=md, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539313",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539314",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539687",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539688",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539689",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4185",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Default",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4185",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4096",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239173",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539690",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Default",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539690",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539315",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539316",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4427",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4427",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4096",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239173",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4452",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4453",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4454",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539692",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539692",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539854",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=sm, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539315",
                children: [
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-slim-border_pressed,#079455)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539316",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539694",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539695",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539696",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4188",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=False, State=Disabled",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4188",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "1101:105294",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239588",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539697",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Disabled",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539697",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539317",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539429",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539318",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4421",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=md, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=md, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4421",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "1101:105294",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239588",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4497",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4498",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4499",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539699",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=md, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539699",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539856",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=md, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539317",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539429",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539318",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539701",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539702",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539703",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4189",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Disabled",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4189",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4106",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239168",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539704",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Disabled",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539704",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=True, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539319",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539383",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539320",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4415",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=True, Size=sm, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4415",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=True, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center justify-end overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4106",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239168",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4470",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4471",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4472",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539706",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=True, Size=sm, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539706",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539861",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=True, Size=sm, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center justify-end relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539319",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539383",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539320",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539708",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539709",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539710",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4192",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=False, State=Focus",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4192",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3297",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239537",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539711",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Focus",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539711",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539321",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539417",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539322",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4409",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=True, State=Focus",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4409",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3297",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239537",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4485",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4486",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4487",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539713",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Focus",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539713",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539860",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=md, State=Focus",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-full",
                asset: null,
                id: "7923:539321",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539417",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539322",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539715",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539716",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539717",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4193",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Focus",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4193",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4098",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239162",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539718",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Focus",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Focus",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539718",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539323",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539338",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539324",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4400",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Focus",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4400",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Focus",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4098",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239162",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4461",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4462",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4463",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539720",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Focus",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Focus",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539720",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539857",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=sm, State=Focus",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 w-full",
                asset: null,
                id: "7923:539323",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539338",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539324",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539722",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539723",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539724",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4196",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=False, State=Hover",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4196",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=False, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3295",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239540",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539725",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Hover",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539725",
        children: [
          {
            tag: "button",
            name: "Type=Slim, Pressed=False, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539325",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539411",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539326",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4397",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4397",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=False, Size=md, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3295",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239540",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4479",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4480",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4481",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539727",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539727",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539855",
            children: [
              {
                tag: "button",
                name: "Type=Slim, Pressed=False, Size=md, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539325",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539411",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539326",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539729",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539730",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539731",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4197",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Hover",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4197",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=False, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4088",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239159",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539732",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Hover",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Hover",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539732",
        children: [
          {
            tag: "button",
            name: "Type=Slim, Pressed=False, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539327",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539340",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539328",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4394",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4394",
        children: [
          {
            tag: "button",
            name: "Type=Default, Pressed=False, Size=sm, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4088",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239159",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4455",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4456",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4457",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539734",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539734",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539853",
            children: [
              {
                tag: "button",
                name: "Type=Slim, Pressed=False, Size=sm, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch cursor-pointer flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539327",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539340",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539328",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539736",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539737",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539738",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4200",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=False, State=Default",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4200",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3293",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239538",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539739",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Default",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539739",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539329",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539398",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539330",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4391",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4391",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "122:3293",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239538",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4473",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4474",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4475",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539741",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539741",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539852",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=md, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539329",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539398",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539330",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539743",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539744",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539745",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4201",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Default",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4201",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4084",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:238901",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539746",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Default",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Default",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539746",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539331",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539341",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539332",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4403",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4403",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4084",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--colors\\/foreground\\/fg-white,white)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:238901",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4449",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4450",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4451",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539748",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539748",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539866",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=sm, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-tertiary,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539331",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539341",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--colors\\/foreground\\/fg-white,white)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539332",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539750",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539751",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539752",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4204",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=False, State=Disabled",
    width: 44,
    height: 24,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4204",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "1101:105292",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239583",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539753",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Disabled",
    width: 40,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539753",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-[40px]",
            asset: null,
            id: "7923:539333",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539423",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                asset: null,
                id: "7923:539334",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4388",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=md, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=md, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4388",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=md, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[24px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[44px]",
            asset: null,
            id: "1101:105292",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[20px]",
                asset: null,
                id: "6305:239583",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1102:4494",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4495",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4496",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539755",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=md, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539755",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[40px]",
            asset: null,
            id: "7923:539863",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=md, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539333",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-secondary,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539423",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[20px]",
                    asset: null,
                    id: "7923:539334",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "7923:539757",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539758",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539759",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4205",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Disabled",
    width: 36,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "1102:4205",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4090",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239165",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539760",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Disabled",
    width: 32,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=False, State=Disabled",
        style: "content-stretch flex flex-col items-start relative",
        asset: null,
        id: "7923:539760",
        children: [
          {
            tag: "div",
            name: "Type=Slim, Pressed=False, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-[32px]",
            asset: null,
            id: "7923:539335",
            children: [
              {
                tag: "div",
                name: "Border",
                style:
                  "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "7923:539342",
                children: [],
              },
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                asset: null,
                id: "7923:539336",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1102:4385",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Default, Pressed=False, Size=sm, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1102:4385",
        children: [
          {
            tag: "div",
            name: "Type=Default, Pressed=False, Size=sm, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[20px] items-center overflow-clip p-[var(--spacing-xxs,2px)] relative rounded-[var(--radius-full,9999px)] shrink-0 w-[36px]",
            asset: null,
            id: "1102:4090",
            children: [
              {
                tag: "div",
                name: "Button",
                style:
                  "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] relative rounded-[var(--radius-full,9999px)] shadow-[0px_1px_3px_0px_var(--colors\\/effects\\/shadows\\/shadow-sm_01,rgba(10,13,18,0.1)),0px_1px_2px_-1px_var(--colors\\/effects\\/shadows\\/shadow-sm_02,rgba(10,13,18,0.1))] shrink-0 size-[16px]",
                asset: null,
                id: "6305:239165",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1102:4467",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1102:4468",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1102:4469",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "7923:539762",
    familyId: "1102:4208",
    index: 3,
    name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Type=Slim, Pressed=False, Size=sm, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "7923:539762",
        children: [
          {
            tag: "div",
            name: "Toggle wrapper",
            style:
              "content-stretch flex flex-col items-start pt-[var(--spacing-xxs,2px)] relative shrink-0 w-[32px]",
            asset: null,
            id: "7923:539865",
            children: [
              {
                tag: "div",
                name: "Type=Slim, Pressed=False, Size=sm, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled,#f5f5f5)] content-stretch flex h-[16px] items-center relative rounded-[var(--radius-full,9999px)] shrink-0 w-full",
                asset: null,
                id: "7923:539335",
                children: [
                  {
                    tag: "div",
                    name: "Border",
                    style:
                      "absolute border border-[var(--colors\\/border\\/border-disabled_subtle,#e9eaeb)] border-solid inset-0 rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "7923:539342",
                    children: [],
                  },
                  {
                    tag: "div",
                    name: "Button",
                    style:
                      "bg-[var(--component-colors\\/components\\/toggles\\/toggle-button-fg_disabled,#fafafa)] border border-[var(--component-colors\\/components\\/toggles\\/toggle-border,#d5d7da)] border-solid relative rounded-[9999px] shadow-[0px_1px_2px_0px_var(--colors\\/effects\\/shadows\\/shadow-xs,rgba(10,13,18,0.05))] shrink-0 size-[16px]",
                    asset: null,
                    id: "7923:539336",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "7923:539764",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "7923:539765",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "7923:539766",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63653",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Focused",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63653",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63654",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386327",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[12.5%]",
                    asset: null,
                    id: "I3281:386327;1097:63958",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63656",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63657",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63658",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1514",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Focused",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1514",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1515",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386285",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "I3281:386285;6305:247863",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1517",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1518",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1519",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:365",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Focused",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:365",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:366",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386550",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[15%]",
                    asset: null,
                    id: "I3281:386550;1097:63953",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:368",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:369",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:370",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1496",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Focused",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1496",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1497",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386059",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "I3281:386059;6305:247885",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1499",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1500",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1501",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:123",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:123",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:124",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386047",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[calc(12.5%-0.75px)]",
                    asset: null,
                    id: "I3281:386047;1097:63990",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck2",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:126",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:127",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:128",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1502",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1502",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1503",
            children: [
              {
                tag: "div",
                name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:549",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(31.25%-0.38px)] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247872",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1505",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1506",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1507",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:371",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:371",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:372",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386216",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[calc(10%-0.8px)]",
                    asset: null,
                    id: "I3281:386216;1097:63985",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck3",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:374",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:375",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:376",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1490",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1490",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1491",
            children: [
              {
                tag: "div",
                name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:566",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(30%-0.4px)] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247894",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1493",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1494",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1495",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63659",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63659",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63660",
            children: [
              {
                tag: "button",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386447",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[12.5%]",
                    asset: null,
                    id: "I3281:386447;1097:63931",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63662",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63663",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63664",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1484",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1484",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1485",
            children: [
              {
                tag: "button",
                name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:546",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247862",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1487",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1488",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1489",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:377",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:377",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:378",
            children: [
              {
                tag: "button",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386300",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[15%]",
                    asset: null,
                    id: "I3281:386300;1097:63925",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:380",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:381",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:382",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1508",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1508",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1509",
            children: [
              {
                tag: "button",
                name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Hover",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:531",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247884",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1511",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1512",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1513",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63665",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63665",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63666",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386068",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[12.5%]",
                    asset: null,
                    id: "I3281:386068;1097:63897",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63668",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63669",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63670",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1478",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1478",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1479",
            children: [
              {
                tag: "div",
                name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:552",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247707",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1481",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1482",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1483",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:357",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:357",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:358",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386427",
                children: [
                  {
                    tag: "div",
                    name: "check",
                    style: "absolute inset-[15%]",
                    asset: null,
                    id: "I3281:386427;1190:582",
                    children: [
                      {
                        tag: "img",
                        name: null,
                        style: "absolute block inset-0 max-w-none size-full",
                        asset: "source4_imgCheck1",
                        id: null,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:360",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:361",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:362",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1472",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1472",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1473",
            children: [
              {
                tag: "div",
                name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Default",
                style:
                  "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:537",
                children: [
                  {
                    tag: "div",
                    name: "Check",
                    style:
                      "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                    asset: null,
                    id: "6305:247877",
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1475",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1476",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1477",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63671",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Focused",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63671",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63672",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386562",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63674",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63675",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63676",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1466",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Focused",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1466",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1467",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386589",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1469",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1470",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1471",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:351",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Focused",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:351",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:352",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386544",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:354",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:355",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:356",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1460",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Focused",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Focused",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1460",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1461",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386294",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1463",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1464",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1465",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:105",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:105",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:106",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386273",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:108",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:109",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:110",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1454",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Disabled",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1454",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1455",
            children: [
              {
                tag: "div",
                name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:562",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1457",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1458",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1459",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:345",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:345",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:346",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386228",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:348",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:349",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:350",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1448",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Disabled",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Disabled",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1448",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1449",
            children: [
              {
                tag: "div",
                name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
                style:
                  "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:564",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1451",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1452",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1453",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63677",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63677",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63678",
            children: [
              {
                tag: "button",
                name: "_Checkbox base",
                style:
                  "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386367",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63680",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63681",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63682",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1442",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Hover",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1442",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1443",
            children: [
              {
                tag: "button",
                name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
                style:
                  "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:557",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1445",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1446",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1447",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:336",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:336",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:337",
            children: [
              {
                tag: "button",
                name: "_Checkbox base",
                style:
                  "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386583",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:339",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:340",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:341",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1436",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Hover",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Hover",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1436",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1437",
            children: [
              {
                tag: "button",
                name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Hover",
                style:
                  "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:540",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1439",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1440",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1441",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63683",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1097:63683",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1097:63684",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
                asset: null,
                id: "3281:386459",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1097:63686",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1097:63687",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1097:63688",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1430",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Default",
    width: 344,
    height: 40,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-md,8px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1430",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1431",
            children: [
              {
                tag: "div",
                name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Default",
                style:
                  "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
                asset: null,
                id: "1100:569",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col items-start leading-[var(--line-height\\/text-sm,20px)] min-w-px relative text-[length:var(--font-size\\/text-sm,14px)]",
            asset: null,
            id: "1100:1433",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1434",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1435",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:328",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:328",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:329",
            children: [
              {
                tag: "div",
                name: "_Checkbox base",
                style:
                  "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
                asset: null,
                id: "3281:386345",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:331",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:332",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:333",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1424",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Default",
    width: 344,
    height: 50,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=True, State=Default",
        style: "content-stretch flex gap-[var(--spacing-lg,12px)] items-start relative w-[344px]",
        asset: null,
        id: "1100:1424",
        children: [
          {
            tag: "div",
            name: "Input",
            style:
              "content-stretch flex items-center justify-center pt-[var(--spacing-xxs,2px)] relative shrink-0",
            asset: null,
            id: "1100:1425",
            children: [
              {
                tag: "div",
                name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Default",
                style:
                  "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
                asset: null,
                id: "1100:544",
                children: [],
              },
            ],
          },
          {
            tag: "div",
            name: "Text and supporting text",
            style:
              "[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-xxs,2px)] items-start leading-[var(--line-height\\/text-md,24px)] min-w-px relative text-[length:var(--font-size\\/text-md,16px)]",
            asset: null,
            id: "1100:1427",
            children: [
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Medium')] font-medium relative shrink-0 text-[color:var(--colors\\/text\\/text-secondary-\\(700\\),#414651)] w-full",
                asset: null,
                id: "1100:1428",
                children: [
                  {
                    text: "Remember me",
                  },
                ],
              },
              {
                tag: "p",
                name: null,
                style:
                  "font-[family-name:var(--font-family\\/font-family-body,'Plus_Jakarta_Sans:Regular')] font-normal relative shrink-0 text-[color:var(--colors\\/text\\/text-tertiary-\\(600\\),#535862)] w-full",
                asset: null,
                id: "1100:1429",
                children: [
                  {
                    text: "Save my login details for next time.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63707",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63707",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:64008",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1097:64008;1097:63958",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6871",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6871",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
            asset: null,
            id: "1224:6872",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1224:6872;1224:6775",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:906",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:906",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:559",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247863",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:305",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:305",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:306",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1100:306;1097:63953",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6869",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6869",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
            asset: null,
            id: "1224:6870",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1224:6870;1224:6808",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:904",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:904",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Focused",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:534",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247885",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63709",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63709",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:64003",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[calc(12.5%-0.75px)]",
                asset: null,
                id: "I1097:64003;1097:63990",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6865",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6865",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1224:6866",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[calc(12.5%-0.75px)]",
                asset: null,
                id: "I1224:6866;1224:6777",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus2",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:902",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:902",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:549",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(31.25%-0.38px)] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247872",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:303",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:303",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:304",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[calc(10%-0.8px)]",
                asset: null,
                id: "I1100:304;1097:63985",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6863",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6863",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1224:6864",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[calc(10%-0.8px)]",
                asset: null,
                id: "I1224:6864;1224:6804",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus3",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:900",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:900",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:566",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(30%-0.4px)] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247894",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63711",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63711",
        children: [
          {
            tag: "button",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:64013",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1097:64013;1097:63931",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6867",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6867",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1224:6868",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1224:6868;1224:6779",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:898",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:898",
        children: [
          {
            tag: "button",
            name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:546",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247862",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:301",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:301",
        children: [
          {
            tag: "button",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:302",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1100:302;1097:63925",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6861",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6861",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1224:6862",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1224:6862;1224:6802",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:896",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:896",
        children: [
          {
            tag: "button",
            name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Hover",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:531",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247884",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63713",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63713",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:64015",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1097:64015;1097:63897",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6859",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6859",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1224:6860",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[12.5%]",
                asset: null,
                id: "I1224:6860;1224:6781",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:894",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:894",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:552",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247707",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:334",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:334",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1959:483542",
            children: [
              {
                tag: "div",
                name: "check",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1959:483542;1190:582",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgCheck1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6857",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1224:6857",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1959:485846",
            children: [
              {
                tag: "div",
                name: "minus",
                style: "absolute inset-[15%]",
                asset: null,
                id: "I1959:485846;1224:6806",
                children: [
                  {
                    tag: "img",
                    name: null,
                    style: "absolute block inset-0 max-w-none size-full",
                    asset: "source4_imgMinus1",
                    id: null,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:892",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:892",
        children: [
          {
            tag: "div",
            name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Default",
            style:
              "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:537",
            children: [
              {
                tag: "div",
                name: "Check",
                style:
                  "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
                asset: null,
                id: "6305:247877",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63715",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63715",
        children: [
          {
            tag: "button",
            name: "_Checkbox base",
            style:
              "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:63965",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:890",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:890",
        children: [
          {
            tag: "button",
            name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
            style:
              "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:557",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:299",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:299",
        children: [
          {
            tag: "button",
            name: "_Checkbox base",
            style:
              "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:300",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:888",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Hover",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:888",
        children: [
          {
            tag: "button",
            name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Hover",
            style:
              "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:540",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63717",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63717",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:63968",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:886",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:886",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
            style:
              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:555",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:363",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:363",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:364",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:884",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Focused",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:884",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Focused",
            style:
              "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:542",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63719",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63719",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:64001",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1001",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:1001",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:562",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:297",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:297",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:298",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:882",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Disabled",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:882",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
            style:
              "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:564",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63721",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1097:63721",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-xs,4px)] shrink-0 size-[16px]",
            asset: null,
            id: "1097:63963",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:1030",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:1030",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Default",
            style:
              "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[16px]",
            asset: null,
            id: "1100:569",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:295",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:295",
        children: [
          {
            tag: "div",
            name: "_Checkbox base",
            style:
              "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--spacing-sm,6px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:296",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1100:880",
    familyId: "1097:63652",
    index: 4,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, Text=False, State=Default",
        style: "content-stretch flex items-center justify-center relative",
        asset: null,
        id: "1100:880",
        children: [
          {
            tag: "div",
            name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Default",
            style:
              "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid relative rounded-[var(--radius-full,9999px)] shrink-0 size-[20px]",
            asset: null,
            id: "1100:544",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63885",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Default",
        style:
          "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63885",
        children: [],
      },
    ],
  },
  {
    id: "1100:569",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Default",
        style:
          "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:569",
        children: [],
      },
    ],
  },
  {
    id: "1097:63991",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63991",
        children: [],
      },
    ],
  },
  {
    id: "1100:562",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:562",
        children: [],
      },
    ],
  },
  {
    id: "1097:63959",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-xs,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[16px]",
        asset: null,
        id: "1097:63959",
        children: [],
      },
    ],
  },
  {
    id: "1100:555",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[16px]",
        asset: null,
        id: "1100:555",
        children: [],
      },
    ],
  },
  {
    id: "1097:63932",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Checkbox, State=Hover",
        style:
          "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63932",
        children: [],
      },
    ],
  },
  {
    id: "1100:557",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Checked=False, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
        style:
          "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:557",
        children: [],
      },
    ],
  },
  {
    id: "1097:63895",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63895",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1097:63897",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6780",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1224:6780",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1224:6781",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:552",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Default",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:552",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247707",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63988",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63988",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[calc(12.5%-0.75px)]",
            asset: null,
            id: "1097:63990",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck1",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6776",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1224:6776",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[calc(12.5%-0.75px)]",
            asset: null,
            id: "1224:6777",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus1",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:549",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:549",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(31.25%-0.38px)] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247872",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63956",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-xs,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[16px]",
        asset: null,
        id: "1097:63956",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1097:63958",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6774",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-xs,6px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[16px]",
        asset: null,
        id: "1224:6774",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1224:6775",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:559",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[16px]",
        asset: null,
        id: "1100:559",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247863",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63929",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Checkbox, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1097:63929",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1097:63931",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6778",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=sm, Type=Checkbox, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-xs,6px)] size-[16px]",
        asset: null,
        id: "1224:6778",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[12.5%]",
            asset: null,
            id: "1224:6779",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:546",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
    width: 16,
    height: 16,
    nodes: [
      {
        tag: "button",
        name: "Checked=True, Indeterminate=False, Size=sm, Type=Radio, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] size-[16px]",
        asset: null,
        id: "1100:546",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[31.25%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247862",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63887",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Default",
        style:
          "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1097:63887",
        children: [],
      },
    ],
  },
  {
    id: "1100:544",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Default",
        style:
          "border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:544",
        children: [],
      },
    ],
  },
  {
    id: "1097:63986",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1097:63986",
        children: [],
      },
    ],
  },
  {
    id: "1100:564",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:564",
        children: [],
      },
    ],
  },
  {
    id: "1097:63954",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-sm,8px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[20px]",
        asset: null,
        id: "1097:63954",
        children: [],
      },
    ],
  },
  {
    id: "1100:542",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-primary,white)] border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[20px]",
        asset: null,
        id: "1100:542",
        children: [],
      },
    ],
  },
  {
    id: "1097:63926",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Checkbox, State=Hover",
        style:
          "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1097:63926",
        children: [],
      },
    ],
  },
  {
    id: "1100:540",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Checked=False, Indeterminate=False, Size=md, Type=Radio, State=Hover",
        style:
          "block border border-[var(--colors\\/border\\/border-primary,#d5d7da)] border-solid cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:540",
        children: [],
      },
    ],
  },
  {
    id: "1190:580",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1190:580",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1190:582",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6805",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1224:6805",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1224:6806",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:537",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Default",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Default",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:537",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247877",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63983",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1097:63983",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[calc(10%-0.8px)]",
            asset: null,
            id: "1097:63985",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck3",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6803",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1224:6803",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[calc(10%-0.8px)]",
            asset: null,
            id: "1224:6804",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus3",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:566",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Disabled",
        style:
          "bg-[var(--colors\\/background\\/bg-disabled_subtle,#fafafa)] border border-[var(--colors\\/border\\/border-disabled,#d5d7da)] border-solid overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:566",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-disabled_subtle,#d5d7da)] inset-[calc(30%-0.4px)] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247894",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63951",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-sm,8px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[20px]",
        asset: null,
        id: "1097:63951",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1097:63953",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6807",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-sm,8px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[20px]",
        asset: null,
        id: "1224:6807",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1224:6808",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:534",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Focused",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Focused",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-full,9999px)] shadow-[0px_0px_0px_2px_var(--colors\\/background\\/bg-primary,white),0px_0px_0px_4px_var(--colors\\/effects\\/focus-rings\\/focus-ring,#17b26a)] size-[20px]",
        asset: null,
        id: "1100:534",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247885",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "1097:63923",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Checkbox, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1097:63923",
        children: [
          {
            tag: "div",
            name: "check",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1097:63925",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgCheck2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1224:6801",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "div",
        name: "Checked=True, Indeterminate=True, Size=md, Type=Checkbox, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] overflow-clip relative rounded-[var(--radius-sm,8px)] size-[20px]",
        asset: null,
        id: "1224:6801",
        children: [
          {
            tag: "div",
            name: "minus",
            style: "absolute inset-[15%]",
            asset: null,
            id: "1224:6802",
            children: [
              {
                tag: "img",
                name: null,
                style: "absolute block inset-0 max-w-none size-full",
                asset: "source5_imgMinus2",
                id: null,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "1100:531",
    familyId: "1097:63886",
    index: 5,
    name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Hover",
    width: 20,
    height: 20,
    nodes: [
      {
        tag: "button",
        name: "Checked=True, Indeterminate=False, Size=md, Type=Radio, State=Hover",
        style:
          "bg-[var(--colors\\/background\\/bg-brand-solid,#079455)] block cursor-pointer overflow-clip relative rounded-[var(--radius-full,9999px)] size-[20px]",
        asset: null,
        id: "1100:531",
        children: [
          {
            tag: "div",
            name: "Check",
            style:
              "absolute bg-[var(--colors\\/foreground\\/fg-white,white)] inset-[30%] rounded-[var(--radius-full,9999px)]",
            asset: null,
            id: "6305:247884",
            children: [],
          },
        ],
      },
    ],
  },
];

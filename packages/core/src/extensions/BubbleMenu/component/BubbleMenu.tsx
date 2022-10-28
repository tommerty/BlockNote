import { Editor } from "@tiptap/core";
import {
  RiBold,
  RiH1,
  RiH2,
  RiH3,
  RiIndentDecrease,
  RiIndentIncrease,
  RiItalic,
  RiLink,
  RiListOrdered,
  RiListUnordered,
  RiStrikethrough,
  RiText,
  RiUnderline,
} from "react-icons/ri";
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { SimpleToolbarDropdown } from "../../../shared/components/toolbar/SimpleToolbarDropdown";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { useEditorForceUpdate } from "../../../shared/hooks/useEditorForceUpdate";
import { findBlock } from "../../Blocks/helpers/findBlock";
import { formatKeyboardShortcut } from "../../../utils";
import LinkToolbarButton from "./LinkToolbarButton";
import { IconType } from "react-icons";

type ListType = "li" | "oli";

function getBlockName(
  currentBlockHeading: number | undefined,
  currentBlockListType: ListType | undefined
) {
  const headings = ["Heading 1", "Heading 2", "Heading 3"];
  const lists = {
    li: "Bullet List",
    oli: "Numbered List",
  };
  // A heading that's also a list, should show as Heading
  if (currentBlockHeading) {
    return headings[currentBlockHeading - 1];
  } else if (currentBlockListType) {
    return lists[currentBlockListType];
  } else {
    return "Text";
  }
}

// TODO: add list options, indentation
export const BubbleMenu = (props: { editor: Editor }) => {
  useEditorForceUpdate(props.editor);

  const currentBlock = findBlock(props.editor.state.selection);
  const currentBlockHeading: number | undefined =
    currentBlock?.node.attrs.headingType;
  const currentBlockListType: ListType | undefined =
    currentBlock?.node.attrs.listType;

  const currentBlockName = getBlockName(
    currentBlockHeading,
    currentBlockListType
  );

  const blockIconMap: Record<string, IconType> = {
    Text: RiText,
    "Heading 1": RiH1,
    "Heading 2": RiH2,
    "Heading 3": RiH3,
    "Bullet List": RiListUnordered,
    "Numbered List": RiListOrdered,
  };

  return (
    <Toolbar>
      <SimpleToolbarDropdown
        text={currentBlockName}
        icon={blockIconMap[currentBlockName]}
        items={[
          {
            onClick: () => {
              // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
              props.editor.view.focus();
              props.editor.chain().unsetBlockHeading().unsetList().run();
            },
            text: "Text",
            icon: RiText,
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor
                .chain()
                .unsetList()
                .setBlockHeading({ level: "1" })
                .run();
            },
            text: "Heading 1",
            icon: RiH1,
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor
                .chain()
                .unsetList()
                .setBlockHeading({ level: "2" })
                .run();
            },
            text: "Heading 2",
            icon: RiH2,
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor
                .chain()
                .unsetList()
                .setBlockHeading({ level: "3" })
                .run();
            },
            text: "Heading 3",
            icon: RiH3,
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor.chain().unsetBlockHeading().setBlockList("li").run();
            },
            text: "Bullet List",
            icon: RiListUnordered,
          },
          {
            onClick: () => {
              props.editor.view.focus();
              props.editor
                .chain()
                .unsetBlockHeading()
                .setBlockList("oli")
                .run();
            },
            text: "Numbered List",
            icon: RiListOrdered,
          },
        ]}
      />
      <SimpleToolbarButton
        onClick={() => {
          // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
          props.editor.view.focus();
          props.editor.commands.toggleBold();
        }}
        isSelected={props.editor.isActive("bold")}
        mainTooltip="Bold"
        secondaryTooltip={formatKeyboardShortcut("Mod+B")}
        icon={RiBold}
      />
      <SimpleToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleItalic();
        }}
        isSelected={props.editor.isActive("italic")}
        mainTooltip="Italic"
        secondaryTooltip={formatKeyboardShortcut("Mod+I")}
        icon={RiItalic}
      />
      <SimpleToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleUnderline();
        }}
        isSelected={props.editor.isActive("underline")}
        mainTooltip="Underline"
        secondaryTooltip={formatKeyboardShortcut("Mod+U")}
        icon={RiUnderline}
      />
      <SimpleToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.toggleStrike();
        }}
        isSelected={props.editor.isActive("strike")}
        mainTooltip="Strike-through"
        secondaryTooltip={formatKeyboardShortcut("Mod+Shift+X")}
        icon={RiStrikethrough}
      />
      <SimpleToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.sinkListItem("block");
        }}
        isDisabled={!props.editor.can().sinkListItem("block")}
        mainTooltip="Indent"
        secondaryTooltip={formatKeyboardShortcut("Tab")}
        icon={RiIndentIncrease}
      />

      <SimpleToolbarButton
        onClick={() => {
          props.editor.view.focus();
          props.editor.commands.liftListItem("block");
        }}
        isDisabled={
          !props.editor.can().command(({ state }) => {
            const block = findBlock(state.selection);
            if (!block) {
              return false;
            }
            // If the depth is greater than 2 you can lift
            return block.depth > 2;
          })
        }
        mainTooltip="Decrease Indent"
        secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
        icon={RiIndentDecrease}
      />

      <LinkToolbarButton
        // editor={props.editor}
        isSelected={props.editor.isActive("link")}
        mainTooltip="Link"
        secondaryTooltip={formatKeyboardShortcut("Mod+K")}
        icon={RiLink}
        editor={props.editor}
      />
      {/* <SimpleBubbleMenuButton
          editor={props.editor}
          onClick={() => {
            const comment = this.props.commentStore.createComment();
            props.editor.chain().focus().setComment(comment.id).run();
          }}
          styleDetails={comment}
        /> */}
    </Toolbar>
  );
};

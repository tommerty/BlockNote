import { Extension } from "@tiptap/core";

import { Fragment, NodeType, Slice } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";
import { mergeBlocksCommand } from "../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { splitBlockCommand } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlockInfoFromResolvedPos,
  getBlockInfoFromSelection,
} from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const KeyboardShortcutsExtension = Extension.create<{
  editor: BlockNoteEditor<any, any, any>;
}>({
  priority: 50,

  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Reverts block content type to a paragraph if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;
            const isParagraph =
              blockInfo.blockContent.node.type.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.command(
                updateBlockCommand(
                  this.options.editor,
                  blockInfo.bnBlock.beforePos,
                  {
                    type: "paragraph",
                    props: {},
                  }
                )
              );
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { blockContent } = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;

            if (selectionAtBlockStart) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, isn't the
        // first block in the doc, and the selection is at the start of the
        // block. The target block for merging must contain inline content.
        () =>
          commands.command(({ state }) => {
            const { bnBlock: blockContainer, blockContent } =
              getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;
            const blockAtDocStart = blockContainer.beforePos === 1;

            const posBetweenBlocks = blockContainer.beforePos;

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              depth === 1
            ) {
              return commands.command(mergeBlocksCommand(posBetweenBlocks));
            }

            return false;
          }),
        // Deletes previous block if it contains no content. If it has inline
        // content, it's merged instead. Otherwise, it's a no-op.
        () =>
          commands.command(({ state }) => {
            const { bnBlock: blockContainer, blockContent } =
              getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;
            const blockAtDocStart = blockContainer.beforePos === 1;

            const $currentBlockPos = state.doc.resolve(
              blockContainer.beforePos
            );
            const prevBlockPos = $currentBlockPos.posAtIndex(
              $currentBlockPos.index() - 1
            );
            const prevBlockInfo = getBlockInfoFromResolvedPos(
              state.doc.resolve(prevBlockPos)
            );

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              $currentBlockPos.depth === 1 &&
              prevBlockInfo.childContainer === undefined &&
              prevBlockInfo.isBlockContainer &&
              prevBlockInfo.blockContent.node.type.spec.content === ""
            ) {
              return commands.deleteRange({
                from: prevBlockPos,
                to: $currentBlockPos.pos,
              });
            }

            return false;
          }),
      ]);

    const handleDelete = () =>
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Merges block with the next one (at the same nesting level or lower),
        // if one exists, the block has no children, and the selection is at the
        // end of the block.
        () =>
          commands.command(({ state }) => {
            // TODO: Change this to not rely on offsets & schema assumptions
            const {
              bnBlock: blockContainer,
              blockContent,
              childContainer,
            } = getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);
            const blockAtDocEnd =
              blockContainer.afterPos === state.doc.nodeSize - 3;
            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;
            const hasChildBlocks = childContainer !== undefined;

            if (
              !blockAtDocEnd &&
              selectionAtBlockEnd &&
              selectionEmpty &&
              !hasChildBlocks
            ) {
              let oldDepth = depth;
              let newPos = blockContainer.afterPos + 1;
              let newDepth = state.doc.resolve(newPos).depth;

              while (newDepth < oldDepth) {
                oldDepth = newDepth;
                newPos += 2;
                newDepth = state.doc.resolve(newPos).depth;
              }

              return commands.command(mergeBlocksCommand(newPos - 1));
            }

            return false;
          }),
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Removes a level of nesting if the block is empty & indented, while the selection is also empty & at the start
        // of the block.
        () =>
          commands.command(({ state }) => {
            const { blockContent, bnBlock: blockContainer } =
              getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;
            const blockIndented = depth > 1;

            if (
              selectionAtBlockStart &&
              selectionEmpty &&
              blockEmpty &&
              blockIndented
            ) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Creates a new block and moves the selection to it if the current one is empty, while the selection is also
        // empty & at the start of the block.
        () =>
          commands.command(({ state, dispatch }) => {
            const { bnBlock: blockContainer, blockContent } =
              getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = blockContainer.afterPos;
              const newBlockContentPos = newBlockInsertionPos + 2;

              if (dispatch) {
                const newBlock =
                  state.schema.nodes["blockContainer"].createAndFill()!;

                state.tr
                  .insert(newBlockInsertionPos, newBlock)
                  .scrollIntoView();
                state.tr.setSelection(
                  new TextSelection(state.doc.resolve(newBlockContentPos))
                );
              }

              return true;
            }

            return false;
          }),
        // Splits the current block, moving content inside that's after the cursor to a new text block below. Also
        // deletes the selection beforehand, if it's not empty.
        () =>
          commands.command(({ state, chain }) => {
            const { blockContent } = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = blockContent.node.childCount === 0;

            if (!blockEmpty) {
              chain()
                .deleteSelection()
                .command(
                  splitBlockCommand(
                    state.selection.from,
                    selectionAtBlockStart,
                    selectionAtBlockStart
                  )
                )
                .run();

              return true;
            }

            return false;
          }),
      ]);

    return {
      Backspace: handleBackspace,
      Delete: handleDelete,
      Enter: handleEnter,
      // Always returning true for tab key presses ensures they're not captured by the browser. Otherwise, they blur the
      // editor since the browser will try to use tab for keyboard navigation.
      Tab: () => {
        if (
          this.options.editor.formattingToolbar?.shown ||
          this.options.editor.linkToolbar?.shown ||
          this.options.editor.filePanel?.shown
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        return this.editor.commands.command(
          sinkListItem(
            this.editor.schema.nodes["blockContainer"],
            this.editor.schema.nodes["blockGroup"]
          )
        );
        // return true;
      },
      "Shift-Tab": () => {
        if (
          this.options.editor.formattingToolbar?.shown ||
          this.options.editor.linkToolbar?.shown ||
          this.options.editor.filePanel?.shown
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        this.editor.commands.liftListItem("blockContainer");
        return true;
      },
      "Shift-Mod-ArrowUp": () => {
        this.options.editor.moveBlockUp();
        return true;
      },
      "Shift-Mod-ArrowDown": () => {
        this.options.editor.moveBlockDown();
        return true;
      },
    };
  },
});

/**
 * This is a modified version of https://github.com/ProseMirror/prosemirror-schema-list/blob/569c2770cbb8092d8f11ea53ecf78cb7a4e8f15a/src/schema-list.ts#L232
 *
 * The original function derives too many information from the parentnode and itemtype
 *
 * TODO: move to separate file?
 */
function sinkListItem(itemType: NodeType, groupType: NodeType) {
  return function ({ state, dispatch }: { state: EditorState; dispatch: any }) {
    const { $from, $to } = state.selection;
    const range = $from.blockRange(
      $to,
      (node) =>
        node.childCount > 0 &&
        (node.type.name === "blockGroup" || node.type.name === "column") // change necessary to not look at first item child type
    );
    if (!range) {
      return false;
    }
    const startIndex = range.startIndex;
    if (startIndex === 0) {
      return false;
    }
    const parent = range.parent;
    const nodeBefore = parent.child(startIndex - 1);
    if (nodeBefore.type !== itemType) {
      return false;
    }
    if (dispatch) {
      const nestedBefore =
        nodeBefore.lastChild && nodeBefore.lastChild.type === groupType; // change necessary to check groupType instead of parent.type
      const inner = Fragment.from(nestedBefore ? itemType.create() : null);
      const slice = new Slice(
        Fragment.from(
          itemType.create(null, Fragment.from(groupType.create(null, inner))) // change necessary to create "groupType" instead of parent.type
        ),
        nestedBefore ? 3 : 1,
        0
      );

      const before = range.start;
      const after = range.end;
      dispatch(
        state.tr
          .step(
            new ReplaceAroundStep(
              before - (nestedBefore ? 3 : 1),
              after,
              before,
              after,
              slice,
              1,
              true
            )
          )
          .scrollIntoView()
      );
    }
    return true;
  };
}

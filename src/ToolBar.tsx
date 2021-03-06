import * as React from "react";
import { EditorState, Modifier, RichUtils, AtomicBlockUtils } from "draft-js";
import * as classnames from "classnames";
import { OrderedSet } from "immutable";
import { CSSProperties } from "react/index";
import { ListStyle, TItem } from "./components/ListStyle";
import { MediaAction, mediaIcons } from "./components/Media/action";
import { TMedia } from "./components/Media/type";
import { ToggleIcon } from "./components/ToggleIcon";
import {
  STYLE_LIST,
  TStyleItem,
  titles,
  lineHeightStyleMap,
  fontFamilyStyleMap,
  fontSizeStyleMap,
  colorStyleMap,
  bgColors
} from "./const";
import { EditorDefaultTools } from "./tools";

interface ToolBtnProps {
  onToggle?: (isBlock: boolean, style: string) => void;
  item: TStyleItem;
  active: boolean;
  disabled?: boolean;
}

interface ToolBtnState {}

class ToolBtn extends React.Component<ToolBtnProps, ToolBtnState> {
  onToggle = (e: any) => {
    e.preventDefault();
    if (this.props.onToggle) {
      this.props.onToggle(
        this.props.item.isBlock || false,
        this.props.item.style
      );
    }
  };

  public render(): JSX.Element {
    const { label, icon } = this.props.item;
    const { disabled } = this.props;

    return (
      <button
        disabled={disabled !== undefined ? disabled : false}
        onMouseDown={this.onToggle}
        className={classnames("qtext-toolbtn", {
          ["qtext-active"]: this.props.active
        })}
      >
        {icon ? <i className={`fa fa-${icon}`} /> : <span>{label}</span>}
      </button>
    );
  }
}

export type TMode = "desktop" | "mobile";
export interface ToolBarProps {
  className?: string;
  editMode: TMode;
  disabled?: string[];
  readOnly: boolean;
  toggleEye: (mode: string) => void;
  toggleMode: (mode: TMode) => void;
  editorState: EditorState;
  changeEditState: (editorState: EditorState) => void;
  rcUploadProps?: any;
  rcSuccess?: (data: any) => string | Promise<string>;
}

export interface ToolBarState {}

export class ToolBar extends React.PureComponent<ToolBarProps, ToolBarState> {
  onToggle = (isBlock: boolean, style: string) => {
    if (isBlock) {
      this.props.changeEditState(
        RichUtils.toggleBlockType(this.props.editorState, style)
      );
    } else {
      this.props.changeEditState(
        RichUtils.toggleInlineStyle(this.props.editorState, style)
      );
    }
  };

  hasInlineStyle(style: string) {
    return this.findInlineStyle().has(style);
  }

  findInlineStyle(): OrderedSet<string> {
    const { editorState } = this.props;
    const currentStyle = editorState.getCurrentInlineStyle();

    return currentStyle;
  }

  hasBlockStyle(style: string): boolean {
    return this.findBlockStyle() === style;
  }

  findBlockStyle(): string {
    const { editorState } = this.props;
    const selection = editorState.getSelection();
    const blockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

    return blockType;
  }

  renderItem(
    toolKey: string,
    children: JSX.Element | JSX.Element[] | null
  ): JSX.Element | JSX.Element[] | null {
    const { disabled } = this.props;

    if (!disabled) {
      return children;
    } else if (
      Array.isArray(disabled) &&
      disabled.find(key => key === toolKey)
    ) {
      return null;
    } else {
      return children;
    }
  }

  public render(): JSX.Element {
    const {
      className,
      editorState,
      changeEditState,
      rcUploadProps,
      rcSuccess,
      readOnly,
      toggleEye
    } = this.props;

    const toolItemList: (
      | JSX.Element
      | JSX.Element[]
      | null)[] = EditorDefaultTools.map(ele => {
      if (readOnly && ele.key !== "preview") {
        return null;
      }

      let resultItem: JSX.Element | JSX.Element[] | null = null;
      const findStyleItem = STYLE_LIST.find(
        styleItem => styleItem.style.toLocaleLowerCase() === ele.key
      );
      if (findStyleItem) {
        const active = findStyleItem.isBlock
          ? this.hasBlockStyle(findStyleItem.style)
          : this.hasInlineStyle(findStyleItem.style);
        resultItem = (
          <ToolBtn
            key={findStyleItem.style}
            item={findStyleItem}
            onToggle={this.onToggle}
            active={active}
          />
        );
      } else {
        switch (ele.key) {
          case "preview":
            resultItem = (
              <ToggleIcon
                value={readOnly ? "Preview" : "Edit"}
                icons={[
                  {
                    icon: "eye-slash",
                    value: "Edit"
                  },
                  {
                    icon: "eye",
                    value: "Preview"
                  }
                ]}
                onToggle={toggleEye}
              />
            );
            break;

          case "pcandmobile":
            resultItem = this.modeBtn();
            break;

          case "undoandredo":
            resultItem = [this._renderUndoBtn(), this._renderRedoBtn()];
            break;

          case "fontfamily":
            resultItem = this._renderFamily();
            break;

          case "fontsize":
            resultItem = this._renderFontSize();
            break;

          case "lineheight":
            resultItem = this._renderLineHeight();
            break;
          case "color":
            resultItem = this._renderColors("color");
            break;
          case "backgroundcolor":
            resultItem = this._renderColors("bgcolor");
            break;
          case "heading":
            resultItem = this._renderTitles();
            break;

          case "image":
          case "video":
          case "link":
          case "audio":
            resultItem = (
              <MediaAction
                editorState={editorState}
                changeEditorState={changeEditState}
                type={ele.key.toLocaleUpperCase() as TMedia}
                rcUploadProps={rcUploadProps}
                rcSuccess={rcSuccess}
              >
                <ToolBtn
                  key={ele.key.toLocaleUpperCase()}
                  item={{
                    icon: mediaIcons[ele.key.toLocaleUpperCase()],
                    label: ele.key,
                    desc: `insert ${ele.key} media`,
                    style: ele.key.toLocaleUpperCase() as TMedia,
                    isBlock: false
                  }}
                  active={false}
                />
              </MediaAction>
            );
            break;

          default:
            return null;
        }
      }

      return this.renderItem(ele.key, resultItem);
    });

    return (
      <div className={classnames("qtext-barbox", className)}>{toolItemList}</div>
    );
  }

  modeBtn() {
    const { toggleMode, editMode } = this.props;

    return (
      <ToggleIcon
        value={editMode}
        icons={[
          {
            icon: "desktop",
            value: "desktop"
          },
          {
            icon: "mobile",
            value: "mobile"
          }
        ]}
        onToggle={function(mode: string) {
          toggleMode(mode as TMode);
        }}
      />
    );
  }

  mediaConfirm = (style: string, name: string, url: string) => {
    const { editorState, changeEditState } = this.props;
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      style,
      "IMMUTABLE",
      { src: url, name }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const newEditorState = EditorState.set(editorState, {
      currentContent: contentStateWithEntity
    });

    changeEditState(
      AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, " ")
    );
  };

  renderActionBtn(
    label: string,
    icon: string,
    desc: string,
    style: string,
    disabled: boolean,
    onToggle: () => void,
    isBlock: boolean = false
  ) {
    return (
      <ToolBtn
        key={label}
        item={{
          icon,
          label,
          desc,
          isBlock,
          style
        }}
        disabled={disabled}
        active={false}
        onToggle={onToggle}
      />
    );
  }

  _renderUndoBtn() {
    const { editorState, changeEditState } = this.props;
    return this.renderActionBtn(
      "撤销",
      "undo",
      "撤销",
      "undo",
      editorState.getUndoStack().isEmpty(),
      function() {
        changeEditState(EditorState.undo(editorState));
      }
    );
  }

  _renderRedoBtn() {
    const { editorState, changeEditState } = this.props;
    return this.renderActionBtn(
      "重做",
      "repeat",
      "重做",
      "undo",
      editorState.getRedoStack().isEmpty(),
      function() {
        changeEditState(EditorState.redo(editorState));
      }
    );
  }

  togglePrp = (data: { [key: string]: CSSProperties }, style: string) => {
    const { editorState, changeEditState } = this.props;
    const selection = editorState.getSelection();

    // Let's just allow one color at a time. Turn off all active colors.
    const nextContentState = Object.keys(data).reduce((contentState, type) => {
      return Modifier.removeInlineStyle(contentState, selection, type);
    }, editorState.getCurrentContent());

    let nextEditorState: EditorState = EditorState.push(
      editorState,
      nextContentState,
      "change-inline-style"
    );

    const currentStyle = editorState.getCurrentInlineStyle();

    // Unset style override for current color.
    if (selection.isCollapsed()) {
      nextEditorState = currentStyle.reduce((state, color) => {
        if (!state || !color) {
          return EditorState.createEmpty();
        }
        return RichUtils.toggleInlineStyle(state, color);
      }, nextEditorState);
    }

    // If the color is being toggled on, apply it.
    if (!currentStyle.has(style)) {
      nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, style);
    }

    changeEditState(nextEditorState);
  };

  _renderTitles() {
    const { onToggle } = this;
    const data: TItem[] = [
      { label: "none", style: "unstyle", desc: "Normal", isBlock: true }
    ]
      .concat(titles)
      .map(ele => {
        const { label, desc, style } = ele;
        return {
          value: style,
          label,
          desc
        };
      });
    const valueItem = data.find(ele => this.hasBlockStyle(ele.value));

    return (
      <ListStyle
        data={data}
        width={120}
        value={valueItem ? valueItem.value : "unstyle"}
        onToggle={function(style: string) {
          onToggle(true, style);
        }}
        renderItem={function(item: TItem) {
          return <span>{item.desc}</span>;
        }}
      />
    );
  }

  _renderColors(type: string) {
    const { togglePrp } = this;
    const isColor = type === "color";
    const sdata = isColor ? colorStyleMap : bgColors;
    const data: TItem[] = Object.keys(sdata).map(value => {
      const style = sdata[value];
      const r: TItem = {
        value,
        label: isColor ? style.color : style.backgroundColor,
        style
      };

      return r;
    });
    const valueItem = data.find(ele => this.hasInlineStyle(ele.value));

    return (
      <ListStyle
        isColor={true}
        data={data}
        width={120}
        value={valueItem ? valueItem.value : isColor ? "black" : "white"}
        onToggle={function(style: string) {
          togglePrp(sdata, style);
        }}
        renderItem={function(item: TItem, isHead: boolean) {
          if (isHead === true) {
            return (
              <span
                style={
                  valueItem &&
                  Object.assign({}, valueItem.style, {
                    width: 30,
                    height: 30,
                    display: "inline-block"
                  })
                }
              >
                <i className={`fa fa-${isColor ? "font" : "paint-brush"}`} />
              </span>
            );
          }

          return (
            <span
              key={item.value}
              style={{
                backgroundColor: item.label
              }}
            />
          );
        }}
      />
    );
  }

  _renderLineHeight() {
    const { togglePrp } = this;
    const data: TItem[] = Object.keys(lineHeightStyleMap)
      .sort()
      .map(value => {
        const style = lineHeightStyleMap[value];
        return {
          value,
          label: value,
          style
        };
      });
    const valueItem = data.find(ele => this.hasInlineStyle(ele.value));

    return (
      <ListStyle
        data={data}
        width={80}
        value={valueItem ? valueItem.value : "1.5"}
        onToggle={function(style: string) {
          togglePrp(lineHeightStyleMap, style);
        }}
        renderItem={function(item: TItem, isHead: boolean) {
          if (isHead) {
            return (
              <span>
                <i className="fa fa-text-height" />
                &nbsp;
                {item.value}
              </span>
            );
          }
          return <span>{item.value}</span>;
        }}
      />
    );
  }
  _renderFamily() {
    const { togglePrp } = this;
    const data: TItem[] = Object.keys(fontFamilyStyleMap).map(value => {
      const style = fontFamilyStyleMap[value];
      return {
        value,
        label: value,
        style
      };
    });
    const valueItem = data.find(ele => this.hasInlineStyle(ele.value));

    return (
      <ListStyle
        data={data}
        width={160}
        value={valueItem ? valueItem.value : "Roboto-Regular"}
        onToggle={function(style: string) {
          togglePrp(fontFamilyStyleMap, style);
        }}
        renderItem={function(item: TItem) {
          return <span style={item.style}>{item.value}</span>;
        }}
      />
    );
  }

  _renderFontSize() {
    const { togglePrp } = this;
    const data: TItem[] = Object.keys(fontSizeStyleMap).map(value => {
      const style = fontSizeStyleMap[value];
      return {
        value,
        label: value,
        style
      };
    });
    const valueItem = data.find(ele => this.hasInlineStyle(ele.value));

    return (
      <ListStyle
        data={data}
        width={40}
        value={valueItem ? valueItem.value : "14"}
        onToggle={function(style: string) {
          togglePrp(fontSizeStyleMap, style);
        }}
        renderItem={function(item: TItem) {
          return <span>{item.value}</span>;
        }}
      />
    );
  }
}

export default ToolBar;

/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare namespace JSX {
  interface IntrinsicElements {
    "ui-modal": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      id?: string;
      children?: React.ReactNode;
    };
    "ui-titlebar": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      title?: string;
      children?: React.ReactNode;
    };
    "s-page": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      heading?: string;
      children?: React.ReactNode;
    };
    "s-section": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      heading?: string;
      children?: React.ReactNode;
    };
    "s-box": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      padding?: string;
      paddingBlockEnd?: string;
      borderWidth?: string;
      borderRadius?: string;
      background?: string;
      children?: React.ReactNode;
    };
    "s-stack": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      direction?: "block" | "inline";
      gap?: string;
      children?: React.ReactNode;
    };
    "s-paragraph": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      children?: React.ReactNode;
    };
    "s-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      variant?: string;
      loading?: boolean;
      disabled?: boolean;
      onClick?: () => void;
      children?: React.ReactNode;
    };
  }
}

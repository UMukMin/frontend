import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      className={`
        relative
        w-full
        h-14
        px-4
        leading-[3.6rem]
        cursor-pointer
        bg-primary-gradient
        hover:bg-primary-gradient-hover
        border
        border-primary-dark
        rounded-r
        outline-none
        transition-all
        duration-300
        ease-in-out
        hover:shadow-lg
        hover:translate-y-[-2px]
        active:translate-y-[1px]
        ${props.className || ''}
      `}
    >
      {children}
    </button>
  );
};

export default Button; 
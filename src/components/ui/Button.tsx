import React from 'react';
import {Text, Pressable, PressableProps} from 'react-native';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '../../utils/cn';

const buttonStyles = cva(
  ['flex', 'h-[44px]', 'px-10', 'py-[11px]', 'justify-center', 'items-end', 'rounded-lg'],
  {
    variants: {
      intent: {
        primary: ['bg-[#FFD60A]', 'text-black'],
        secondary: ['bg-[#FF9F0A]', 'text-black'],
        outline: ['border', 'border-[#FF9F0A]', 'text-[#FF9F0A]'],
      },
    },
    defaultVariants: {
      intent: 'primary',
    },
  },
);

type ButtonVariants = VariantProps<typeof buttonStyles>;

interface ButtonProps extends PressableProps, ButtonVariants {
  children: React.ReactNode;
  className?: string;
}

const Button = ({children, intent, className, ...props}: ButtonProps) => {
  return (
    <Pressable className={cn(buttonStyles({intent}), className)} {...props}>
      <Text className={buttonStyles({intent})}>{children}</Text>
    </Pressable>
  );
};

export default Button;

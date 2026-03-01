"use client";
import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";

interface CartItem {
    id: string;
    code: string;
    name: string;
    brand?: string;
    unit: string;
    quantity: number;
    categoryPath: string;
    withdrawQty: number;
}

interface CartContextType {
    cart: CartItem[];
    isOpen: boolean;
    addToCart: (part: any) => void;
    removeItem: (id: string) => void;
    updateQty: (id: string, delta: number) => void;
    clearCart: () => void;
    setIsOpen: (v: boolean) => void;
    submitting: boolean;
    success: boolean;
    reason: string;
    setReason: (v: string) => void;
    handleBatchSubmit: () => Promise<void>;
    totalItems: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be inside CartProvider");
    return ctx;
}

const getCategoryPath = (p: any): string => {
    if (!p?.category) return "";
    const parts: string[] = [p.category.name];
    if (p.category.parent) {
        parts.unshift(p.category.parent.name);
        if (p.category.parent.parent) parts.unshift(p.category.parent.parent.name);
    }
    return parts.join(" › ");
};

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [reason, setReason] = useState("");
    const cartRef = useRef<CartItem[]>([]);

    const addToCart = useCallback((part: any) => {
        const prev = cartRef.current;
        const existing = prev.find(i => i.id === part.id);

        let next: CartItem[];
        if (existing) {
            if (existing.withdrawQty >= existing.quantity) {
                toast.warning(`${part.name}: สต็อกไม่เพียงพอ (มี ${existing.quantity} ${existing.unit})`, { duration: 2000 });
                return;
            }
            next = prev.map(i => i.id === part.id ? { ...i, withdrawQty: i.withdrawQty + 1 } : i);
            toast.success(`${part.name} +1 (รวม ${existing.withdrawQty + 1})`, { duration: 1500 });
        } else {
            next = [...prev, {
                id: part.id, code: part.code, name: part.name, brand: part.brand,
                unit: part.unit, quantity: part.quantity,
                categoryPath: getCategoryPath(part), withdrawQty: 1,
            }];
            toast.success(`เพิ่ม ${part.name} ลงตะกร้า`, { duration: 1500 });
        }

        cartRef.current = next;
        setCart(next);
        setIsOpen(true);
    }, []);

    const updateQty = useCallback((id: string, delta: number) => {
        setCart(prev => {
            const next = prev.map(item => {
                if (item.id !== id) return item;
                const newQty = Math.max(1, Math.min(item.withdrawQty + delta, item.quantity));
                return { ...item, withdrawQty: newQty };
            });
            cartRef.current = next;
            return next;
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setCart(prev => {
            const next = prev.filter(i => i.id !== id);
            cartRef.current = next;
            if (next.length === 0) setIsOpen(false);
            return next;
        });
    }, []);

    const clearCart = useCallback(() => {
        cartRef.current = [];
        setCart([]);
        setIsOpen(false);
        setReason("");
        setSuccess(false);
    }, []);

    const handleBatchSubmit = useCallback(async () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            const res = await fetch("/api/movements/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    items: cart.map(i => ({ partId: i.id, quantity: i.withdrawQty })),
                    reason: reason || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "ไม่สามารถเบิกได้");
            }
            setSuccess(true);
            setTimeout(() => clearCart(), 2500);
        } catch (err: any) {
            toast.error(err.message || "ไม่สามารถเบิกได้");
        } finally {
            setSubmitting(false);
        }
    }, [cart, reason, clearCart]);

    const totalItems = cart.reduce((sum, i) => sum + i.withdrawQty, 0);

    return (
        <CartContext.Provider value={{
            cart, isOpen, addToCart, removeItem, updateQty, clearCart,
            setIsOpen, submitting, success, reason, setReason, handleBatchSubmit, totalItems,
        }}>
            {children}
        </CartContext.Provider>
    );
}

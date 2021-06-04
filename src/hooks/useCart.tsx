import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`);
      const product = response.data;

      let productExist = false;
      const updatedCart = cart.map((cartItem) => {
        if (cartItem.id === productId) {
          productExist = true;

          return {
            ...cartItem,
            amount: cartItem.amount + 1,
          };
        } else {
          return cartItem;
        }
      });

      if (productExist) {
        const amount = updatedCart.filter(
          (product) => product.id === productId
        )[0].amount;

        if (!(await validateStockAmount(productId, amount))) {
          return;
        }

        setCart(updatedCart);
      } else {
        if (!(await validateStockAmount(productId, 1))) {
          return;
        }
        const newProduct = {
          ...product,
          amount: 1,
        };
        setCart([...updatedCart, newProduct]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartUpdated = cart.filter((product) => product.id !== productId);
      setCart(cartUpdated);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      if (!(await validateStockAmount(productId, amount))) {
        return;
      }

      const cartUpdated = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount };
        }
        return product;
      });
      setCart(cartUpdated);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  async function validateStockAmount(productId: number, amount: number) {
    const response = await api.get(`/stock/${productId}`);
    const stock = response.data;

    if (amount > stock.amount || 0) {
      toast.error("Quantidade solicitada fora de estoque");
      return false;
    }
    return true;
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

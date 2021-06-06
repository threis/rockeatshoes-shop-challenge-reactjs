import {
  createContext,
  ReactNode,
  useContext,
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

  const addProduct = async (productId: number) => {
    try {
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
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        if (!(await validateStockAmount(productId, 1))) {
          return;
        }

        const response = await api.get(`/products/${productId}`);
        const product = response.data;

        const newProduct = {
          ...product,
          amount: 1,
        };
        setCart([...updatedCart, newProduct]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...updatedCart, newProduct])
        );
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existsProduct = cart.find((product) => product.id === productId);

      if (!existsProduct) {
        throw new Error();
      }
      const updatedCart = cart.filter((product) => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!(await validateStockAmount(productId, amount))) {
        return;
      }

      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount };
        }
        return product;
      });
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
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

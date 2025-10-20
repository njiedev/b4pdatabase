import { createBrowserRouter } from "react-router-dom";
import { MedicalSuppliesPage } from "../pages/MedicalSuppliesPage.tsx";
import NotFoundPage from "../pages/404Page.tsx";
import Providers from "../Providers.tsx";
import { AuthPage } from "@/pages/AuthPage.tsx";

const router = createBrowserRouter([
  // I recommend you reflect the routes here in the pages folder
  {
    path: "/",
    element: <Providers />,
    children: [
      // Auth Home Page - this is the main home page
      {
        index: true,
        element: <AuthPage />,
      },
      // Medical Supplies Page (Protected)
      {
        path: "dashboard",
        element: <MedicalSuppliesPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;

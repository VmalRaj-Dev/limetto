"use client";

import { useEffect, useMemo, useState, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Sparkles,
  CheckCircle,
  AlertCircle,
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

// Register the locale for country names
countries.registerLocale(enLocale);

// Define your Zod schema for validation
const signUpSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol."),
  chosen_category_id: z.string().min(1, "Please select your specialization."),

  street: z.string().min(1, "Street address is required."),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  country: z.string().min(1, "Country is required."),
  zipcode: z.string().min(4, "Zipcode is required."),
});

// Infer the type from the schema for type safety
type SignUpFormValues = z.infer<typeof signUpSchema>;

interface AuthFormProps {
  onSignupSuccess?: Dispatch<SetStateAction<string | null>>;
}

export default function SignUp({ onSignupSuccess }: AuthFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      chosen_category_id: "",
    },
    mode: "onChange",
  });

  const [categories, setCategories] = useState<
    { id: number; category: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("categories")
        .select("id, category"); // Select the id and name columns
      // .order('category', { ascending: true }); // Optional: order alphabetically by name
      if (error) {
        console.error("Error fetching categories:", error.message);
        setError(error.message);
      } else {
        setCategories(data);
      }
      setLoading(false);
    }

    fetchCategories();
  }, [supabase]);

  // Get country list once
  const countryOptions = useMemo(() => {
    const countryObj = countries.getNames("en", { select: "official" });
    return Object.entries(countryObj).map(([code, name]) => ({
      code,
      name,
    }));
  }, []);

  const onSubmit = async (data: SignUpFormValues) => {
    setStatus("idle"); // Reset status on new submission attempt
    setMessage("");

    try {
      // Supabase Insertion Logic
      // In a real application, you'd typically use `supabase.auth.signUp`
      // to handle user authentication and then potentially link to a 'profiles' table.
      // For this example, we are directly inserting into a 'users' table.
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
           emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/start-trial`,
          data: {
            name: data.name,
            chosen_category_id: data.chosen_category_id,
            street: data.street,
            city: data.city,
            state: data.state,
            country: data.country,
            zipcode: data.zipcode,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create account.");
      }
      setStatus("success");
      setMessage("Account created successfully! Welcome to Limetto.");
      reset(); // Reset form fields on success
      if (onSignupSuccess) {
        onSignupSuccess(data.email);
      }
    } catch (error: unknown) {
      console.error("Supabase Error:", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  if(error){
    return(
      <div>Error...</div>
    )
  }

  if(loading){
    return(
      <div>Loading...</div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-lime rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Limetto</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Join the freelance platform
          </p>
        </div>

        {/* Main Signup Card */}
        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Create your account
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Start your freelance journey with Limetto today.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    {...register("name")}
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    {...register("email")}
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    {...register("password")}
                    className="pl-10 pr-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {/* Password requirements info */}
                <div className="text-xs text-muted-foreground mt-1">
                  Password must contain:
                  <ul className="list-disc list-inside ml-2">
                    <li>At least 6 characters</li>
                    <li>One lowercase letter</li>
                    <li>One uppercase letter</li>
                    <li>One symbol</li>
                  </ul>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-foreground"
                >
                  Your specialization
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("chosen_category_id", value, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={`w-full h-12 bg-background border-border focus:border-primary focus:ring-primary ${
                      isSubmitting ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select your category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((option) => (
                      <SelectItem
                        key={option.id}
                        value={option.id.toString()}
                        className="cursor-pointer"
                      >
                        {option.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.chosen_category_id && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.chosen_category_id.message}
                  </p>
                )}
              </div>
              {/* <div className="space-y-4 mt-6 pt-6 border-t border-border/50">
                <h3 className="text-sm font-medium text-foreground">
                  Payment Information
                </h3>

                <div className="space-y-2">
                  <Label
                    htmlFor="cardNumber"
                    className="text-sm font-medium text-foreground"
                  >
                    Card Number
                  </Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    {...register("cardNumber")}
                    className="h-12 bg-background border-border"
                  />
                  {errors.cardNumber && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.cardNumber.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cardExpiry"
                      className="text-sm font-medium text-foreground"
                    >
                      Expiry Date (MM/YY)
                    </Label>
                    <Input
                      id="cardExpiry"
                      type="text"
                      placeholder="12/25"
                      {...register("cardExpiry")}
                      className="h-12 bg-background border-border"
                    />
                    {errors.cardExpiry && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.cardExpiry.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="cardCvc"
                      className="text-sm font-medium text-foreground"
                    >
                      CVC
                    </Label>
                    <Input
                      id="cardCvc"
                      type="text"
                      placeholder="123"
                      {...register("cardCvc")}
                      className="h-12 bg-background border-border"
                    />
                    {errors.cardCvc && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.cardCvc.message}
                      </p>
                    )}
                  </div>
                </div>
              </div> */}
              <div className="space-y-4 mt-6 pt-6 border-t border-border/50">
                <h3 className="text-sm font-medium text-foreground">
                  Billing Address
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    placeholder="123 Main St"
                    {...register("street")}
                  />
                  {errors.street && (
                    <p className="text-destructive text-xs">
                      {errors.street.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} />
                    {errors.city && (
                      <p className="text-destructive text-xs">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" {...register("state")} />
                    {errors.state && (
                      <p className="text-destructive text-xs">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col justify-end space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      {...register("country")}
                      className="w-full h-12 bg-background border border-border rounded-md px-3 text-sm focus:border-primary focus:ring-primary appearance-none"
                      disabled={isSubmitting}
                      defaultValue=""
                      style={{ minHeight: "3rem" }}
                    >
                      <option value="" disabled>
                        Select your country
                      </option>
                      {countryOptions.map(({ code, name }) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="text-destructive text-xs">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col justify-end space-y-2">
                    <Label htmlFor="zipcode">Zipcode</Label>
                    <Input id="zipcode" {...register("zipcode")} className="h-12" />
                    {errors.zipcode && (
                      <p className="text-destructive text-xs">
                        {errors.zipcode.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full h-12 bg-gradient-lime hover:bg-lime-accent text-primary-foreground font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Create Account
                  </div>
                )}
              </Button>
            </form>

            {/* Status Messages */}
            {status !== "idle" && (
              <div
                className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm animate-fade-in ${
                  status === "success"
                    ? "bg-lime-secondary text-foreground border border-primary/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {status === "success" ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <p>{message}</p>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                🔒 Your data is secure and will never be shared with third
                parties.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => router.replace("/login")}
              className="text-lime-primary hover:text-lime-accent font-medium transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

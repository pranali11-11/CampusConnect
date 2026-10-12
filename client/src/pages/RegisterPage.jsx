import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../services/authService";
import { useToast } from "../hooks/useToast";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Biotechnology",
  "Mathematics",
  "Physics",
  "Chemistry",
];

const ROLES = [
  { value: "student", label: "Student", icon: "🎓" },
  { value: "teacher", label: "Teacher", icon: "👨‍🏫" },
];

const VALIDATORS = {
  name: (v) =>
    v.trim().length >= 3 ? "" : "Name must be at least 3 characters",
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address",
  mobile: (v) =>
    /^[0-9]{10}$/.test(v) ? "" : "Mobile must be exactly 10 digits",
  password: (v) =>
    v.length >= 8 ? "" : "Password must be at least 8 characters",
  confirmPassword: (v, form) =>
    v === form.password ? "" : "Passwords do not match",
  rollNumber: (v, form) =>
    form.role !== "student" || v.trim()
      ? ""
      : "Roll number is required for students",
  department: (v) => (v ? "" : "Please select a department"),
};

const getPasswordStrength = (password) => {
  if (!password) return { level: "", width: "0%", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;

  if (score <= 1) return { level: "Weak", width: "33%", color: "bg-rose-500" };
  if (score <= 2)
    return { level: "Medium", width: "66%", color: "bg-amber-500" };
  return { level: "Strong", width: "100%", color: "bg-emerald-500" };
};

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: "",
    rollNumber: "",
    mobile: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error =
        VALIDATORS[name]?.(value, { ...formData, [name]: value }) || "";
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = VALIDATORS[name]?.(value, formData) || "";
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    if (name === "password" && touched.confirmPassword) {
      const confirmErr = VALIDATORS.confirmPassword(formData.confirmPassword, {
        ...formData,
        password: value,
      });
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const fieldClass = (name) => {
    if (!touched[name])
      return "border-slate-200 dark:border-slate-600 focus:border-primary";
    if (fieldErrors[name]) return "border-rose-500 focus:border-rose-500";
    return "border-emerald-500 focus:border-emerald-500";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setTouched(allTouched);

    const errors = {};
    Object.keys(VALIDATORS).forEach((key) => {
      const err = VALIDATORS[key](formData[key], formData);
      if (err) errors[key] = err;
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { name, email, password, role, department, rollNumber, mobile } =
        formData;
      await authService.register({
        name,
        email,
        password,
        role,
        department,
        rollNumber: role === "student" ? rollNumber : undefined,
        mobile,
      });

      showToast("Registration successful! Redirecting to login...", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || error.message || "Registration failed.";
      showToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputWrapper = (icon, name, type, placeholder, extra) => (
    <div>
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
        {name === "confirmPassword"
          ? "Confirm Password"
          : name.charAt(0).toUpperCase() +
            name.slice(1).replace(/([A-Z])/g, " $1")}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:text-white ${fieldClass(name)} ${extra || ""}`}
        />
      </div>
      {touched[name] && fieldErrors[name] && (
        <p className="text-xs text-rose-500 mt-1">{fieldErrors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="flex-grow min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-primary/5 via-white to-secondary/10 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10">
      <div className="max-w-xl w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl mb-3 shadow-lg shadow-primary/30">
            🎓
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            CampusConnect
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Create your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Full Name */}
          <div className="md:col-span-2">
            {inputWrapper("👤", "name", "text", "e.g. Pranesh Ram")}
          </div>

          {/* Roll Number */}
          {formData.role === "student" && (
            <div className="md:col-span-2">
              {inputWrapper("🔢", "rollNumber", "text", "e.g. 20CS1045")}
            </div>
          )}

          {/* Department */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Department
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🏫
              </span>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:text-white appearance-none ${fieldClass("department")}`}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            {touched.department && fieldErrors.department && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.department}
              </p>
            )}
          </div>

          {/* Email */}
          <div>{inputWrapper("📧", "email", "email", "you@college.edu")}</div>

          {/* Mobile */}
          <div>{inputWrapper("📱", "mobile", "tel", "9876543210")}</div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔒
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:text-white ${fieldClass("password")}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {formData.password && (
              <div className="mt-2">
                <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p
                  className={`text-[10px] font-semibold mt-1 ${
                    strength.level === "Weak"
                      ? "text-rose-500"
                      : strength.level === "Medium"
                        ? "text-amber-500"
                        : "text-emerald-500"
                  }`}
                >
                  {strength.level}
                </p>
              </div>
            )}
            {touched.password && fieldErrors.password && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔒
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:text-white ${fieldClass("confirmPassword")}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {touched.confirmPassword && fieldErrors.confirmPassword && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Role tabs */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              I am a
            </label>
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: r.value }))
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                    formData.role === r.value
                      ? "bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  <span>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-primary/25 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 dark:border-slate-700 mt-6 pt-6 text-center text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-bold"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

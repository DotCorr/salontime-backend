# Stripe Connect Setup Guide

## 🔧 **Required: Complete Stripe Connect Platform Profile**

You need to complete your Stripe Connect platform profile before accounts can be created.

### **Step 1: Go to Stripe Dashboard**
1. Visit: https://dashboard.stripe.com/settings/connect/platform-profile
2. Complete all required fields:
   - **Platform name**: SalonTime (or your preferred name)
   - **Platform website**: Your website URL
   - **Platform description**: Brief description of your platform
   - **Support email**: Your support email
   - **Support phone**: Your support phone (optional)

### **Step 2: Accept Platform Responsibilities**
1. Read and accept the platform responsibilities
2. This is required for managing connected accounts

### **Step 3: Test Your Integration**
After completing the setup, your Stripe Connect integration should work properly.

## 🚨 **Current Error Messages**

- `"Please review the responsibilities of managing losses for connected accounts"`
- `"Stripe Connect platform not properly configured"`

These will be resolved once you complete the platform profile setup.

## ✅ **After Setup**

Once you complete the platform profile:
1. Your backend will be able to create Stripe Connect accounts
2. Your Flutter app will be able to generate onboarding links
3. Salon owners will be able to complete Stripe onboarding

## 🔍 **Testing**

After setup, test with:
1. Create a Stripe account (should return 201)
2. Get onboarding link (should return 200 with URL)
3. Complete onboarding flow in Flutter app

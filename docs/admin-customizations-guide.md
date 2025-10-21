# Admin Guide: Product Customizations

This guide shows you how to add customizations to products in the admin panel.

## Accessing Product Customizations

When creating or editing a product, you'll find the **Product Customizations** section at the bottom of the form.

## Customization Types

### 1. No Customizations (Default)

Standard product with a fixed price. Customers can only select quantity.

**Use for**: Regular cookies, brownies, simple items

### 2. Size Variants

Perfect for products that come in different sizes with fixed prices per size.

**Use for**: Cakes that come in standard sizes (6", 9", 12")

#### How to Set Up Size Variants:

1. Select **"Size Variants"** from the customization type dropdown
2. Click **"Add Variant"** to add a new size
3. For each variant, fill in:
   - **Size Name**: e.g., "6 inch", "9 inch", "12 inch"
   - **Price**: The exact price for this size in dollars
   - **Description** (optional): e.g., "Serves 6-8 people"
4. Click **"Set as Default"** on one variant to make it the default selection
5. Remove unwanted variants with the X button

**Example**: Chocolate Celebration Cake

- 6 inch - $45.00 (Default) - Serves 6-8 people
- 9 inch - $70.00 - Serves 12-15 people
- 12 inch - $100.00 - Serves 20-25 people

### 3. Custom Cake Builder

For fully customizable products where customers build their cake by selecting multiple options.

**Use for**: Custom design cakes, build-your-own options

#### How to Set Up Custom Builder:

1. Select **"Custom Cake Builder"** from the customization type dropdown
2. Set the **Base Price** - the starting price before any customizations
3. Click **"Add Option"** to add a customization category

#### For Each Option:

**Basic Settings:**

- **Option Name**: e.g., "Cake Size", "Flavor", "Frosting Type"
- **Selection Type**:
  - **Single Choice**: Customer picks one (radio buttons) - e.g., cake size
  - **Multiple Choices**: Customer can pick several (checkboxes) - e.g., toppings
- **Description** (optional): Help text for customers
- **Required**: Check if customer must make a selection

**Advanced Settings (for Multiple Choices):**

- **Min Selections**: Minimum number of choices (optional)
- **Max Selections**: Maximum number of choices (optional)

**Adding Choices:**

1. Click **"Add Choice"** within an option
2. For each choice:
   - **Choice Name**: e.g., "Chocolate", "Vanilla", "Strawberry"
   - **Price Modifier**: Amount to add or subtract from base price
     - Use positive numbers to add: `5.00` adds $5
     - Use negative numbers to subtract: `-2.00` subtracts $2
     - Use `0.00` for no change
   - **Description** (optional): Details about this choice
   - **Set as default**: Check to pre-select this choice

**Example**: Custom Design Cake

**Base Price**: $50.00

**Option 1: Cake Size** (Single Choice, Required)

- 6 inch - $0.00 (Default) - Serves 6-8
- 9 inch - $25.00 - Serves 12-15
- 12 inch - $50.00 - Serves 20-25

**Option 2: Cake Flavor** (Single Choice, Required)

- Chocolate - $0.00 (Default)
- Vanilla - $0.00
- Red Velvet - $5.00
- Lemon - $3.00

**Option 3: Frosting Type** (Single Choice, Required)

- Buttercream - $0.00 (Default)
- Cream Cheese - $3.00
- Whipped Cream - $2.00

**Option 4: Toppings** (Multiple Choices, Max 3)

- Fresh Berries - $8.00
- Chocolate Shavings - $4.00
- Sprinkles - $2.00
- Edible Flowers - $10.00
- Gold Leaf - $15.00

**Option 5: Custom Message** (Single Choice, Optional)

- No message - $0.00 (Default)
- Custom message - $5.00

## Price Calculation Examples

### Size Variants

Customer selects: 9 inch
**Final Price**: $70.00 (the variant's price)

### Custom Builder

**Base Price**: $50.00
Customer selects:

- Cake Size: 9 inch (+$25.00)
- Flavor: Red Velvet (+$5.00)
- Frosting: Buttercream (+$0.00)
- Toppings: Fresh Berries (+$8.00), Sprinkles (+$2.00)
- Custom Message: Custom message (+$5.00)

**Final Price**: $50 + $25 + $5 + $0 + $8 + $2 + $5 = **$95.00**

## Tips and Best Practices

### For Size Variants:

1. **Always mark a default**: One variant should be marked as default
2. **Clear descriptions**: Help customers understand serving sizes
3. **Logical pricing**: Larger sizes should cost more
4. **Common sizes**: Use standard cake sizes your bakery offers

### For Custom Builder:

1. **Organize logically**: Order options from most to least important
2. **Start with required options**: Put size and flavor first
3. **Use helpful descriptions**: Explain what each choice means
4. **Price thoughtfully**:
   - Premium ingredients should cost more
   - Labor-intensive options should cost more
   - Common options can be $0.00
5. **Set sensible limits**: Use max selections for toppings/add-ons
6. **Mark defaults**: Pre-select the most popular choices
7. **Test the math**: Make sure prices add up correctly

## Common Patterns

### Basic Cake with Sizes

```
Type: Size Variants
- Small (6"): $30
- Medium (9"): $45
- Large (12"): $60
```

### Simple Custom Cake

```
Type: Custom Builder
Base Price: $40

Options:
1. Size (required, single)
   - Small: $0
   - Medium: $10
   - Large: $20

2. Flavor (required, single)
   - Vanilla: $0
   - Chocolate: $0
   - Strawberry: $3
```

### Advanced Custom Cake

```
Type: Custom Builder
Base Price: $50

Options:
1. Size (required, single)
2. Cake Flavor (required, single)
3. Filling (optional, single)
4. Frosting Type (required, single)
5. Frosting Flavor (required, single)
6. Toppings (optional, multiple, max 3)
7. Custom Decorations (optional, multiple)
```

## Validation

The form will prevent you from saving if:

- Size variants have no name
- Custom builder has no options
- Options have no name
- Options have no choices
- Choices have no name

Make sure to fill in all required fields before saving!

## Customer Experience

### What Customers See:

**Size Variants**:

- Clean selection with radio buttons
- Price displayed for each size
- Description shown under each option

**Custom Builder**:

- Step-by-step or all-at-once interface
- Real-time price calculator
- Visual feedback for selections
- Clear error messages for required fields

## Editing Existing Products

You can add, remove, or modify customizations at any time:

1. Go to Admin → Products
2. Click on a product to edit
3. Scroll to Product Customizations
4. Make your changes
5. Click "Update Product"

**Note**: Changes to customizations will only affect new orders. Existing orders keep their original configuration.

## Need Help?

- **Technical docs**: See `/docs/product-customizations.md`
- **Code examples**: See `/docs/customizations-usage-example.md`
- **Quick start**: See `/docs/customizations-quick-start.md`

type CategoryHeaderProps = {
  name: string;
  description: string | null;
};

export function CategoryHeader({ name, description }: CategoryHeaderProps) {
  return (
    <div className="bg-muted/30 border-b mb-8">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{name}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
    </div>
  );
}

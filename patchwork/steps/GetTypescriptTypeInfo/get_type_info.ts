import fs from "fs";
import path from "path";

// Base directory for allowed TypeScript files
const ALLOWED_BASE_PATH = process.cwd();

/**
 * Validates and normalizes a file path to prevent path traversal attacks
 * @param filePath The file path to validate
 * @returns The normalized absolute path if valid
 * @throws Error if path is outside allowed directory or invalid
 */
function validateFilePath(filePath: string): string {
  if (!filePath) {
    throw new Error('File path cannot be empty');
  }

  const normalizedPath = path.normalize(filePath);
  const absolutePath = path.resolve(ALLOWED_BASE_PATH, normalizedPath);
  
  if (!absolutePath.startsWith(ALLOWED_BASE_PATH)) {
    throw new Error('Access denied: Path is outside allowed directory');
  }
  
  // Check if file exists and is accessible
  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Cannot access file: ${error.message}`);
    }
    throw new Error('Cannot access file: Unknown error');
  }

  // Verify it's a file and not a directory
  try {
    if (!fs.statSync(absolutePath).isFile()) {
      throw new Error('Path must point to a file');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
    throw new Error('File validation failed: Unknown error');
  }

  return absolutePath;
}
import {
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  Project,
  PropertyDeclaration,
  Type,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";

class TypeInfo {
  private maxDepth: number;

  private project: Project;

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth;
    this.project = new Project();
  }

  public describe(identifier: string, filePath: string): string {
    // Validate and normalize the file path before using it
    const validatedPath = validateFilePath(filePath);
    const sourceFile = this.project.addSourceFileAtPath(validatedPath);

    const classDeclaration = sourceFile.getClass(identifier);
    if (classDeclaration) {
      return this.describeClass(classDeclaration, 0);
    }

    const interfaceDeclaration = sourceFile.getInterface(identifier);
    if (interfaceDeclaration) {
      return this.describeInterface(interfaceDeclaration, 0);
    }

    const typeAlias = sourceFile.getTypeAlias(identifier);
    if (typeAlias) {
      return this.describeTypeAlias(typeAlias, 0);
    }

    const variable = sourceFile.getVariableDeclaration(identifier);
    if (variable) {
      return this.describeVariable(variable, 0);
    }

    const functionDeclaration = sourceFile.getFunction(identifier);
    if (functionDeclaration) {
      return this.describeFunction(functionDeclaration, 0);
    }

    const enumDeclaration = sourceFile.getEnum(identifier);
    if (enumDeclaration) {
      return this.describeEnum(enumDeclaration, 0);
    }

    throw new Error(`Identifier ${identifier} not found in ${filePath}`);
  }

  private describeVariable(
    variable: VariableDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}const ${variable.getName()}: ${this.describeType(
      variable.getType(),
      depth + 1
    )}`;
  }

  private describeFunction(
    functionDeclaration: FunctionDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}function ${functionDeclaration.getName()}(${functionDeclaration
      .getParameters()
      .map(
        (param) =>
          `${param.getName()}: ${this.describeType(param.getType(), depth + 1)}`
      )
      .join(", ")}): ${this.describeType(
      functionDeclaration.getReturnType(),
      depth + 1
    )}`;
  }

  private describeClass(
    classDeclaration: ClassDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}class ${classDeclaration.getName()} {
${classDeclaration
  .getProperties()
  .map((property) => this.describeProperty(property, depth + 1))
  .join("\n")}
${classDeclaration
  .getMethods()
  .map((method) =>
    this.describeFunction(method as unknown as FunctionDeclaration, depth + 1)
  )
  .join("\n")}
${indent}}`;
  }

  private describeProperty(
    property: PropertyDeclaration,
    depth: number
  ): string {
    const indent = "  ".repeat(depth);
    return `${indent}  ${property.getName()}: ${this.describeType(
      property.getType(),
      depth + 1
    )}`;
  }

  private describeInterface(
    interfaceDeclaration: InterfaceDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}interface ${interfaceDeclaration.getName()} {
${interfaceDeclaration
  .getProperties()
  .map((property) =>
    this.describeProperty(property as unknown as PropertyDeclaration, depth + 1)
  )
  .join("\n")}
${interfaceDeclaration
  .getMethods()
  .map((method) =>
    this.describeFunction(method as unknown as FunctionDeclaration, depth + 1)
  )
  .join("\n")}
${indent}}`;
  }

  private describeTypeAlias(
    typeAlias: TypeAliasDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}type ${typeAlias.getName()} = ${this.describeType(
      typeAlias.getType(),
      depth + 1
    )}`;
  }

  private describeEnum(
    enumDeclaration: EnumDeclaration,
    depth: number
  ): string {
    if (depth > this.maxDepth) {
      return "";
    }
    const indent = "  ".repeat(depth);
    return `${indent}enum ${enumDeclaration.getName()} {
${enumDeclaration
  .getMembers()
  .map((member) => `${indent}  ${member.getName()} = ${member.getValue()}`)
  .join(",\n")}
${indent}}`;
  }

  private describeType(type: Type, depth: number): string {
    if (depth > this.maxDepth) {
      return "...";
    }
    const indent = "  ".repeat(depth);

    if (type.isUnion()) {
      return type
        .getUnionTypes()
        .map((t) => this.describeType(t, depth))
        .join(" | ");
    }

    if (type.isIntersection()) {
      return type
        .getIntersectionTypes()
        .map((t) => this.describeType(t, depth))
        .join(" & ");
    }

    if (type.isArray()) {
      return `${this.describeType(type.getArrayElementType()!, depth)}[]`;
    }

    if (type.isObject() && !type.isInterface()) {
      const properties = type.getProperties();
      if (properties.length === 0) {
        return "{}";
      }
      return `{
${properties
  .map((prop) => {
    const valueDeclaration = prop.getValueDeclaration();
    if (!valueDeclaration) {
      return `${indent}  ${prop.getName()}: unknown`;
    }
    return `${indent}  ${prop.getName()}: ${this.describeType(
      prop.getTypeAtLocation(valueDeclaration),
      depth + 1
    )}`;
  })
  .join(",\n")}
${indent}}`;
    }

    return type.getText();
  }
}

function getTypeDescriptor(
  identifier: string,
  filePath: string,
  maxDepth: number
): string {
  return new TypeInfo(maxDepth).describe(identifier, filePath);
}

function main() {
  try {
    const args = process.argv.slice(2);
    let maxDepth = 5;
    let filePath, identifier;

    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith("--max-depth=")) {
        maxDepth = parseInt(args[i].split("=")[1], 10);
        if (isNaN(maxDepth) || maxDepth < 0) {
          throw new Error("Invalid max depth value: must be a non-negative number");
        }
      } else if (!filePath) {
        filePath = args[i];
      } else if (!identifier) {
        identifier = args[i];
      }
    }

    if (!filePath || !identifier) {
      throw new Error(
        "Usage: node script.js <file_path> <identifier> [--max-depth=<number>]"
      );
    }

    // Log the attempt before validation
    console.log(
      "Attempting to get type info for",
      identifier,
      "in",
      filePath,
      "with max depth",
      maxDepth
    );

    // Will throw if path is invalid
    const validatedPath = validateFilePath(filePath);

    const typeString = getTypeDescriptor(identifier, validatedPath, maxDepth);
    const outputPath = path.join(process.cwd(), "temp_output_declaration.txt");

    fs.writeFileSync(outputPath, typeString, "utf8");
    console.log(`Type information has been written to ${outputPath}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred');
    }
    // Exit with different codes for different types of errors
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        process.exit(2); // Security-related errors
      } else if (error.message.includes('Cannot access file') || error.message.includes('File validation failed')) {
        process.exit(3); // File access/validation errors
      } else if (error.message.includes('Usage:')) {
        process.exit(4); // Usage/parameter errors
      }
    }
    process.exit(1); // Unknown errors
  }
}

main();

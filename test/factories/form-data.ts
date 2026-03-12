type FormDataValue = string | number | boolean | Array<string> | null | undefined;

export function createFormData(entries: Record<string, FormDataValue>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      formData.set(key, value.join('\n'));
      continue;
    }

    formData.set(key, String(value));
  }

  return formData;
}

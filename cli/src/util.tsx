import React from "react";

const bannedCharacters = /([^A-z0-9])|^([0-9]+)/gm;

export const sanitizeReasonNonModuleName = (name: string) => {
  const removedBanned = name.replace(bannedCharacters, "");
  return `${removedBanned[0].toLowerCase()}${removedBanned.slice(1)}`;
};
export const sanitizeReasonModuleName = (name: string) => {
  const removedBanned = name.replace(bannedCharacters, "");
  return `${removedBanned[0].toUpperCase()}${removedBanned.slice(1)}`;
};

export const Module = (props: { name: string; children: React.ReactNode }) =>
  React.createElement("module", props);
export const ExternalBinding = (props: {
  valueName: string;
  externalName: string;
  annotations?: string[];
}) => React.createElement("external-binding", props);

variable "subscription_id" {
  description = "ID della subscription Azure"
  type        = string
}

variable "project_name" {
  type    = string
  default = "lab23"
}

variable "environment" {
  description = "Ambiente (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Regione Azure"
  type        = string
  default     = "westeurope"
}
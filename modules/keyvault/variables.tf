variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "tenant_id" { type = string }
variable "admin_object_id" { type = string }
variable "reader_object_ids" { type = list(string) }

variable "db_password" {
  type      = string
  sensitive = true
}
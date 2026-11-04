variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tags" { type = map(string) }
variable "admin_login" { type = string }
variable "database_name" { type = string }
variable "allowed_ip" {
  type    = string
  default = ""
}